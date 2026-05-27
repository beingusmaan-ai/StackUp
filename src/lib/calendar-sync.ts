import { db } from "@/lib/db";

interface Conn {
  id: string;
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  syncToken: string | null;
  deltaLink: string | null;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

async function getGoogleToken(conn: Conn): Promise<string> {
  if (conn.expiresAt && conn.expiresAt > new Date(Date.now() + 60_000)) return conn.accessToken;
  if (!conn.refreshToken) throw new Error("No Google refresh token");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: conn.refreshToken,
      grant_type:    "refresh_token",
    }),
  });
  const d = await res.json();
  if (!d.access_token) throw new Error("Google token refresh failed");
  await db.calendarConnection.update({
    where: { id: conn.id },
    data: { accessToken: d.access_token, expiresAt: new Date(Date.now() + (d.expires_in ?? 3600) * 1000) },
  });
  return d.access_token;
}

async function getMicrosoftToken(conn: Conn): Promise<string> {
  if (conn.expiresAt && conn.expiresAt > new Date(Date.now() + 60_000)) return conn.accessToken;
  if (!conn.refreshToken) throw new Error("No Microsoft refresh token");
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: conn.refreshToken,
      grant_type:    "refresh_token",
      scope:         "Calendars.ReadWrite offline_access",
    }),
  });
  const d = await res.json();
  if (!d.access_token) throw new Error("Microsoft token refresh failed");
  await db.calendarConnection.update({
    where: { id: conn.id },
    data: {
      accessToken: d.access_token,
      expiresAt:   new Date(Date.now() + (d.expires_in ?? 3600) * 1000),
      ...(d.refresh_token ? { refreshToken: d.refresh_token } : {}),
    },
  });
  return d.access_token;
}

// ─── Event format helpers ─────────────────────────────────────────────────────

type EventLike = {
  title: string;
  description?: string | null;
  startTime: Date | string;
  endTime:   Date | string;
  allDay:    boolean;
};

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function toGoogleEvent(ev: EventLike) {
  const s = new Date(ev.startTime), e = new Date(ev.endTime);
  if (ev.allDay) return { summary: ev.title, description: ev.description ?? "", start: { date: toDateStr(s) }, end: { date: toDateStr(e) } };
  return { summary: ev.title, description: ev.description ?? "", start: { dateTime: s.toISOString() }, end: { dateTime: e.toISOString() } };
}

function toMicrosoftEvent(ev: EventLike) {
  const s = new Date(ev.startTime), e = new Date(ev.endTime);
  return {
    subject:  ev.title,
    body:     { contentType: "text", content: ev.description ?? "" },
    start:    { dateTime: s.toISOString().slice(0, 19), timeZone: "UTC" },
    end:      { dateTime: e.toISOString().slice(0, 19), timeZone: "UTC" },
    isAllDay: ev.allDay,
  };
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
}

// ─── Google pull ──────────────────────────────────────────────────────────────

export async function syncFromGoogle(userId: string) {
  const conn = await db.calendarConnection.findUnique({ where: { userId_provider: { userId, provider: "GOOGLE" } } });
  if (!conn) return;
  const token = await getGoogleToken(conn);

  const base = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  const timeMin = new Date(Date.now() - 30 * 86_400_000).toISOString();
  let url = conn.syncToken
    ? `${base}?syncToken=${encodeURIComponent(conn.syncToken)}`
    : `${base}?timeMin=${encodeURIComponent(timeMin)}&maxResults=250&singleEvents=true&orderBy=startTime`;

  let nextSyncToken: string | null = null;
  let pageToken: string | undefined;

  do {
    const pageUrl = pageToken ? `${url}&pageToken=${pageToken}` : url;
    const res = await fetch(pageUrl, { headers: { Authorization: `Bearer ${token}` } });

    if (res.status === 410) {
      await db.calendarConnection.update({ where: { id: conn.id }, data: { syncToken: null } });
      return syncFromGoogle(userId);
    }

    const data = await res.json();
    nextSyncToken = data.nextSyncToken ?? null;
    pageToken = data.nextPageToken;

    for (const g of data.items ?? []) {
      if (g.status === "cancelled") {
        await db.calendarEvent.deleteMany({ where: { userId, googleEventId: g.id } });
        continue;
      }
      const startRaw = g.start?.dateTime ?? g.start?.date;
      const endRaw   = g.end?.dateTime   ?? g.end?.date;
      if (!startRaw || !endRaw) continue;

      const allDay    = !g.start?.dateTime;
      const startTime = new Date(startRaw);
      const endTime   = allDay ? (() => { const d = new Date(endRaw); d.setHours(23,59,59,999); return d; })() : new Date(endRaw);

      const payload = {
        title: g.summary ?? "(No title)", description: g.description ?? null,
        startTime, endTime, allDay, type: "MEETING", syncSource: "GOOGLE", googleEventId: g.id,
      };

      const existing = await db.calendarEvent.findFirst({ where: { userId, googleEventId: g.id } });
      if (existing) {
        const gUp = g.updated ? new Date(g.updated) : null;
        if (!gUp || gUp > existing.updatedAt) await db.calendarEvent.update({ where: { id: existing.id }, data: payload });
      } else {
        await db.calendarEvent.create({ data: { ...payload, userId } });
      }
    }
  } while (pageToken);

  if (nextSyncToken) await db.calendarConnection.update({ where: { id: conn.id }, data: { syncToken: nextSyncToken } });
}

// ─── Microsoft pull ───────────────────────────────────────────────────────────

export async function syncFromMicrosoft(userId: string) {
  const conn = await db.calendarConnection.findUnique({ where: { userId_provider: { userId, provider: "MICROSOFT" } } });
  if (!conn) return;
  const token = await getMicrosoftToken(conn);

  const tMin = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const tMax = new Date(Date.now() + 90 * 86_400_000).toISOString();
  let url: string = conn.deltaLink
    ? conn.deltaLink
    : `https://graph.microsoft.com/v1.0/me/calendarView/delta?startDateTime=${tMin}&endDateTime=${tMax}&$top=50`;

  let nextDelta: string | null = null;
  let nextLink: string | null = url;

  while (nextLink) {
    const msRes: Response = await fetch(nextLink, { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' } });

    if (msRes.status === 410 || msRes.status === 400) {
      await db.calendarConnection.update({ where: { id: conn.id }, data: { deltaLink: null } });
      return syncFromMicrosoft(userId);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await msRes.json();
    nextDelta = data["@odata.deltaLink"] ?? null;
    nextLink  = data["@odata.nextLink"]  ?? null;

    for (const m of data.value ?? []) {
      if (m["@removed"]) {
        await db.calendarEvent.deleteMany({ where: { userId, outlookEventId: m.id } });
        continue;
      }
      const startTime = new Date(m.start?.dateTime ?? m.start);
      const endTime   = new Date(m.end?.dateTime   ?? m.end);
      const allDay    = m.isAllDay ?? false;

      const payload = {
        title:       m.subject ?? "(No title)",
        description: m.body?.content ? stripHtml(m.body.content) : null,
        startTime, endTime, allDay, type: "MEETING", syncSource: "MICROSOFT", outlookEventId: m.id,
      };

      const existing = await db.calendarEvent.findFirst({ where: { userId, outlookEventId: m.id } });
      if (existing) {
        const mUp = m.lastModifiedDateTime ? new Date(m.lastModifiedDateTime) : null;
        if (!mUp || mUp > existing.updatedAt) await db.calendarEvent.update({ where: { id: existing.id }, data: payload });
      } else {
        await db.calendarEvent.create({ data: { ...payload, userId } });
      }
    }
  }

  if (nextDelta) await db.calendarConnection.update({ where: { id: conn.id }, data: { deltaLink: nextDelta } });
}

// ─── Push to providers ────────────────────────────────────────────────────────

type PushEvent = EventLike & { id: string; googleEventId?: string | null; outlookEventId?: string | null };

export async function pushToGoogle(userId: string, ev: PushEvent, action: "create" | "update" | "delete") {
  const conn = await db.calendarConnection.findUnique({ where: { userId_provider: { userId, provider: "GOOGLE" } } });
  if (!conn) return;
  const token = await getGoogleToken(conn);
  const base = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

  if (action === "delete") {
    if (!ev.googleEventId) return;
    await fetch(`${base}/${ev.googleEventId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  } else if (ev.googleEventId) {
    await fetch(`${base}/${ev.googleEventId}`, {
      method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(toGoogleEvent(ev)),
    });
  } else {
    const res = await fetch(base, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(toGoogleEvent(ev)),
    });
    if (res.ok) {
      const d = await res.json();
      await db.calendarEvent.update({ where: { id: ev.id }, data: { googleEventId: d.id } });
    }
  }
}

export async function pushToMicrosoft(userId: string, ev: PushEvent, action: "create" | "update" | "delete") {
  const conn = await db.calendarConnection.findUnique({ where: { userId_provider: { userId, provider: "MICROSOFT" } } });
  if (!conn) return;
  const token = await getMicrosoftToken(conn);
  const base = "https://graph.microsoft.com/v1.0/me/events";

  if (action === "delete") {
    if (!ev.outlookEventId) return;
    await fetch(`${base}/${ev.outlookEventId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  } else if (ev.outlookEventId) {
    await fetch(`${base}/${ev.outlookEventId}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(toMicrosoftEvent(ev)),
    });
  } else {
    const res = await fetch(base, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(toMicrosoftEvent(ev)),
    });
    if (res.ok) {
      const d = await res.json();
      await db.calendarEvent.update({ where: { id: ev.id }, data: { outlookEventId: d.id } });
    }
  }
}

export async function pushToAllProviders(userId: string, ev: PushEvent, action: "create" | "update" | "delete") {
  await Promise.allSettled([
    pushToGoogle(userId, ev, action),
    pushToMicrosoft(userId, ev, action),
  ]);
}
