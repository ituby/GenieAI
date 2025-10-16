import { useState, useEffect, useRef } from 'react';
import { generateLoadingMessages, getRandomLoadingMessage } from '../data/loadingMessages';

interface UseLoadingMessagesProps {
  goalTitle: string;
  goalDescription: string;
  category: string;
  preferredTimeRanges: Array<{ label: string; start_hour: number; end_hour: number }>;
  preferredDays: number[];
  planDurationDays: number;
  isActive: boolean;
}

export const useLoadingMessages = ({
  goalTitle,
  goalDescription,
  category,
  preferredTimeRanges,
  preferredDays,
  planDurationDays,
  isActive,
}: UseLoadingMessagesProps) => {
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [messageIndex, setMessageIndex] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesRef = useRef<string[]>([]);

  // Generate messages when props change
  useEffect(() => {
    const messages = generateLoadingMessages(
      goalTitle,
      goalDescription,
      category,
      preferredTimeRanges,
      preferredDays,
      planDurationDays
    );
    messagesRef.current = messages.map(msg => msg.text);
  }, [goalTitle, goalDescription, category, preferredTimeRanges, preferredDays, planDurationDays]);

  // Start/stop the message rotation
  useEffect(() => {
    if (isActive && messagesRef.current.length > 0) {
      // Set initial message
      setCurrentMessage(messagesRef.current[0]);
      setMessageIndex(0);

      // Start rotating messages
      intervalRef.current = setInterval(() => {
        setMessageIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % messagesRef.current.length;
          setCurrentMessage(messagesRef.current[nextIndex]);
          return nextIndex;
        });
      }, 2000); // Change message every 2 seconds
    } else {
      // Stop rotation
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCurrentMessage('');
      setMessageIndex(0);
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  // Get a random message (for one-time use)
  const getRandomMessage = () => {
    return getRandomLoadingMessage(
      goalTitle,
      goalDescription,
      category,
      preferredTimeRanges,
      preferredDays,
      planDurationDays
    );
  };

  // Get current progress percentage
  const getProgress = () => {
    if (!isActive || messagesRef.current.length === 0) return 0;
    return Math.min((messageIndex / messagesRef.current.length) * 100, 100);
  };

  // Get estimated time remaining (in seconds)
  const getEstimatedTimeRemaining = () => {
    if (!isActive || messagesRef.current.length === 0) return 0;
    const remainingMessages = messagesRef.current.length - messageIndex;
    return remainingMessages * 2; // 2 seconds per message
  };

  return {
    currentMessage,
    messageIndex,
    totalMessages: messagesRef.current.length,
    progress: getProgress(),
    estimatedTimeRemaining: getEstimatedTimeRemaining(),
    getRandomMessage,
  };
};

