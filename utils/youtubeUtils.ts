import { TranscriptEntry } from '../types';

// FIX: Declare YT and onYouTubeIframeAPIReady on the window object to fix TypeScript errors.
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function extractVideoID(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Parses a string containing a timestamped transcript into an array of TranscriptEntry objects.
 * Handles [HH:MM:SS], [MM:SS], and MM:SS formats and calculates durations between entries.
 * @param text The raw transcript text.
 * @returns An array of TranscriptEntry objects.
 */
export function parseTimestampedTranscript(text: string): TranscriptEntry[] {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    // Regex to capture timestamps like [HH:MM:SS], [MM:SS], or MM:SS, with optional milliseconds and brackets.
    const regex = /(?:\[\s*)?(?:(\d+):)?(\d+):(\d+)(?:[.,]\d+)?(?:\])?\s*(.*)/;

    const parsedTimestamps: { text: string; start: number }[] = [];

    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            const hours = match[1] ? parseInt(match[1], 10) : 0;
            const minutes = parseInt(match[2], 10);
            const seconds = parseInt(match[3], 10);
            
            let totalSeconds: number;
            if (match[1] !== undefined) { // HH:MM:SS format
                totalSeconds = hours * 3600 + minutes * 60 + seconds;
            } else { // MM:SS format
                totalSeconds = minutes * 60 + seconds;
            }

            parsedTimestamps.push({ text: match[4].trim(), start: totalSeconds });
        }
    }

    if (parsedTimestamps.length === 0) {
        return [];
    }

    const result: TranscriptEntry[] = parsedTimestamps.map((entry, index) => {
        let duration: number;
        if (index < parsedTimestamps.length - 1) {
            duration = parsedTimestamps[index + 1].start - entry.start;
        } else {
            duration = 5; // Default duration for the last entry as per test expectations.
        }
        // Ensure duration is positive for playback.
        return { ...entry, duration: Math.max(1, duration) };
    });

    return result;
}

let apiLoaded: Promise<void> | null = null;

export function loadYouTubeAPI(): Promise<void> {
    if (apiLoaded) {
        return apiLoaded;
    }

    apiLoaded = new Promise((resolve) => {
        // If the API is already loaded, resolve immediately.
        if (window.YT && window.YT.Player) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);

        // The YouTube API will call this global function when it's ready.
        window.onYouTubeIframeAPIReady = () => {
            resolve();
        };
    });

    return apiLoaded;
}
