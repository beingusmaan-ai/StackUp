"use client";

import { useState, useRef, useEffect } from "react";

export type Clip = {
  id: string;
  url: string;
  name: string;
  durationMs: number;
  createdAt: Date;
  sizeMb: number;
};

export function useScreenRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const mrRef = useRef<MediaRecorder | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function startRecording(micDeviceId: string) {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const allTracks = [...screenStream.getTracks()];
      streamsRef.current = [screenStream];

      if (micDeviceId !== "none") {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: micDeviceId === "default" ? true : { deviceId: { exact: micDeviceId } },
          });
          streamsRef.current.push(micStream);
          allTracks.push(...micStream.getAudioTracks());
        } catch {
          // mic unavailable — record without it
        }
      }

      const combined = new MediaStream(allTracks);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const mr = new MediaRecorder(combined, { mimeType });
      mrRef.current = mr;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const clip: Clip = {
          id: crypto.randomUUID(),
          url,
          name: `Clip — ${new Date().toLocaleString()}`,
          durationMs: Date.now() - startTimeRef.current,
          createdAt: new Date(),
          sizeMb: blob.size / (1024 * 1024),
        };
        streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
        setClips((prev) => [clip, ...prev]);
        setIsRecording(false);
        setElapsedMs(0);
        if (timerRef.current) clearInterval(timerRef.current);
      };

      // Handle user stopping via the browser's native "Stop sharing" button
      screenStream.getVideoTracks()[0].addEventListener("ended", () => {
        if (mrRef.current?.state === "recording") mrRef.current.stop();
      });

      mr.start(500);
      setIsRecording(true);
      timerRef.current = setInterval(() => setElapsedMs(Date.now() - startTimeRef.current), 500);
    } catch {
      // user cancelled or permission denied
    }
  }

  function stopRecording() {
    if (mrRef.current?.state === "recording") mrRef.current.stop();
  }

  function deleteClip(id: string) {
    setClips((prev) => {
      const clip = prev.find((c) => c.id === id);
      if (clip) URL.revokeObjectURL(clip.url);
      return prev.filter((c) => c.id !== id);
    });
  }

  return { isRecording, clips, elapsedMs, startRecording, stopRecording, deleteClip };
}
