// Avatar.tsx
"use client";
import { useState } from "react";
import { useUser } from "../hooks/useUser";
import { AvatarProps } from "@/types";

// Shadcn Components
import { Avatar as ShadcnAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Add this near the top of the file, after imports
const pulseKeyframes = `
  @keyframes subtle-pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
`;

// Add the keyframes to the document
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = pulseKeyframes;
  document.head.appendChild(style);
}

// Create segments for the circle
const TOTAL_SEGMENTS = 20;
const CIRCLE_PADDING = 4; // Padding around the avatar
const BASE_AVATAR_SIZE = 40; // Base size for sm avatar
const CIRCLE_SIZE = BASE_AVATAR_SIZE + CIRCLE_PADDING * 2; // Total size including padding
const STROKE_WIDTH = 2;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENT_LENGTH = CIRCUMFERENCE / TOTAL_SEGMENTS;
const GAP_ANGLE = (2 * Math.PI) / 180; // 2 degree gap between segments

// Function to calculate segment path
const getSegmentPath = (index: number) => {
  const segmentAngle = (2 * Math.PI) / TOTAL_SEGMENTS;
  const startAngle = index * segmentAngle;
  const endAngle = startAngle + segmentAngle - GAP_ANGLE;

  const startX = CIRCLE_SIZE / 2 + RADIUS * Math.cos(startAngle - Math.PI / 2);
  const startY = CIRCLE_SIZE / 2 + RADIUS * Math.sin(startAngle - Math.PI / 2);
  const endX = CIRCLE_SIZE / 2 + RADIUS * Math.cos(endAngle - Math.PI / 2);
  const endY = CIRCLE_SIZE / 2 + RADIUS * Math.sin(endAngle - Math.PI / 2);

  const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";

  return `M ${startX} ${startY} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
};

// Simple user icon for fallback
const UserIcon = () => (
  <svg
    className="w-6 h-6 text-slate-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

export default function Avatar({
  size = "md",
  editMode = false,
  navbar = false,
  userEditForm = false,
  sourceUrl,
  className = "",
  lessonsCount = 0,
}: AvatarProps) {
  const { avatarUrl, uploadImage } = useUser();
  const [uploading, setUploading] = useState(false);

  // Get image URL from props or context
  const imgUrl = sourceUrl || avatarUrl || null;

  // Size mapping for avatar
  const sizeClass = {
    sm: userEditForm ? "h-20 w-20" : "h-10 w-10", // 2x size for userEditForm
    md: userEditForm ? "h-32 w-32" : "h-16 w-16", // 2x size for userEditForm
    lg: userEditForm ? "h-48 w-48" : "h-24 w-24", // 2x size for userEditForm
    xl: userEditForm ? "h-72 w-72" : "h-36 w-36", // 2x size for userEditForm
  }[size];

  // Calculate completed segments
  const completedSegments = Math.min(lessonsCount, TOTAL_SEGMENTS);

  // Calculate circle size based on userEditForm
  const scaleFactor = userEditForm ? 2 : 1;
  const scaledCircleSize = CIRCLE_SIZE * scaleFactor;
  const scaledRadius = RADIUS * scaleFactor;
  const scaledStrokeWidth = STROKE_WIDTH * (userEditForm ? 3 : 1.5); // Slightly thicker stroke for larger circle

  // Function to calculate segment path with scaling
  const getScaledSegmentPath = (index: number) => {
    const segmentAngle = (2 * Math.PI) / TOTAL_SEGMENTS;
    const startAngle = index * segmentAngle;
    const endAngle = startAngle + segmentAngle - GAP_ANGLE;

    const startX =
      scaledCircleSize / 2 + scaledRadius * Math.cos(startAngle - Math.PI / 2);
    const startY =
      scaledCircleSize / 2 + scaledRadius * Math.sin(startAngle - Math.PI / 2);
    const endX =
      scaledCircleSize / 2 + scaledRadius * Math.cos(endAngle - Math.PI / 2);
    const endY =
      scaledCircleSize / 2 + scaledRadius * Math.sin(endAngle - Math.PI / 2);

    const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";

    return `M ${startX} ${startY} A ${scaledRadius} ${scaledRadius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  };

  // Progress Circle Component with scaling
  const ProgressCircle = () => (
    <svg
      width={scaledCircleSize}
      height={scaledCircleSize}
      viewBox={`0 0 ${scaledCircleSize} ${scaledCircleSize}`}
      className="absolute"
      style={{
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}>
      {Array.from({ length: TOTAL_SEGMENTS }).map((_, index) => (
        <path
          key={index}
          d={getScaledSegmentPath(index)}
          strokeWidth={scaledStrokeWidth}
          fill="none"
          className={`transition-colors duration-300 ${
            index < completedSegments
              ? "stroke-green-500 dark:stroke-green-500"
              : "stroke-slate-200"
          }`}
        />
      ))}
    </svg>
  );

  // Simple avatar for navbar
  if (navbar) {
    return (
      <div
        className="relative inline-flex items-center justify-center"
        style={{
          width: scaledCircleSize,
          height: scaledCircleSize,
          contain: "paint",
        }}>
        <ProgressCircle />
        <ShadcnAvatar
          className={`
            ${sizeClass}
            ${className}
            relative
            z-10
            bg-slate-100
            overflow-hidden
          `}>
          {imgUrl ? (
            <img
              src={imgUrl}
              alt="Avatar"
              className="h-full w-full object-cover"
              loading="eager"
              decoding="sync"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <UserIcon />
            </div>
          )}
        </ShadcnAvatar>
      </div>
    );
  }

  // Full card with upload functionality
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Immagine profilo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div
          className="relative inline-flex items-center justify-center"
          style={{
            width: scaledCircleSize,
            height: scaledCircleSize,
            contain: "paint",
          }}>
          <ProgressCircle />
          <ShadcnAvatar
            className={`
              ${sizeClass}
              mb-4
              relative
              z-10
              bg-slate-100
              overflow-hidden
            `}>
            {imgUrl ? (
              <img
                src={imgUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
                loading="eager"
                decoding="sync"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <UserIcon />
              </div>
            )}
          </ShadcnAvatar>
        </div>

        {editMode && (
          <div className="mt-4 w-full">
            <label htmlFor="avatar-upload" className="w-full">
              <div className="w-full cursor-pointer">
                <Button className="w-full" disabled={uploading}>
                  {uploading ? "Caricamento..." : "Carica foto"}
                </Button>
              </div>
            </label>
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              onChange={uploadImage}
              disabled={uploading}
              className="sr-only"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
