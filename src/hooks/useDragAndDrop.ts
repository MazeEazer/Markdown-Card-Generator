// src/hooks/useDragAndDrop.ts
import { useState, useRef, useCallback } from 'react';

export function useDragAndDrop(onFile: (dataUrl: string, fileName: string) => void) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (!file.type.startsWith('image/')) {
          console.warn('Only image files are allowed');
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            onFile(ev.target.result as string, file.name);
          }
        };
        reader.readAsDataURL(file);
      }
    },
    [onFile]
  );

  return { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop };
}