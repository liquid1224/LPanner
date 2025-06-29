import React, { type FC, useEffect, useState, useCallback, useMemo, type CSSProperties } from "react";
// @ts-expect-error Juce does not have types
import { getSliderState } from "juce-framework-frontend";
import { Flex } from "antd";

interface JuceKnobProps {
  identifier: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  size?: number;
  sensitivity?: number;
  primaryColor: string;
  accentColor: string;
}

const JuceKnob: FC<JuceKnobProps> = ({ identifier, min = 0.0, max = 1.0, defaultValue = 0.5, size = 60, sensitivity = 0.5, primaryColor, accentColor }) => {
  // Get JUCE slider state
  const sliderState = getSliderState(identifier);

  // Component states
  const [normalizedValue, setNormalizedValue] = useState(sliderState.getNormalisedValue());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(0);

  // Calculate actual value from normalized value to min ~ max range
  const range = max - min;
  const actualValue = normalizedValue * range + min;

  // Calculate knob rotation angle（-135deg ~ +135deg）
  const rotationAngle = (normalizedValue - 0.5) * 270;

  // Sync with JUCE state changes
  useEffect(() => {
    const handleStateChange = () => {
      setNormalizedValue(sliderState.getNormalisedValue());
    };

    // Subscribe to JUCE value change event
    const listenerId = sliderState.valueChangedEvent.addListener(handleStateChange);

    // Cleanup listener on unmount
    return () => sliderState.valueChangedEvent.removeListener(listenerId);
  }, [sliderState]);

  // Update JUCE parameter value with clamping to valid range
  const updateJuceValue = (normalized: number) => {
    const clampedValue = Math.max(0, Math.min(1, normalized));
    sliderState.setNormalisedValue(clampedValue);
  };

  // Handle mouse down event to start dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      setIsDragging(true);
      setDragStartY(e.clientY);
      setDragStartValue(normalizedValue);

      // Hide cursor during dragging
      document.body.style.cursor = "none";
    },
    [normalizedValue]
  );

  // Handle mouse move event to change parameter value and rotation angle
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      e.preventDefault();

      const deltaY = dragStartY - e.clientY;
      const valueChange = deltaY * sensitivity * 0.01;
      const newValue = dragStartValue + valueChange;

      updateJuceValue(newValue);
    },
    [isDragging, dragStartY, dragStartValue, updateJuceValue]
  );

  // Handle mouse up event to end dragging
  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    // Show cursor
    document.body.style.cursor = "";
  }, [isDragging]);

  // Handle double click to reset default value
  const handleDoubleClick = () =>
    useCallback(() => {
      {
        const normalizedDefault = (defaultValue - min) / range;
        updateJuceValue(normalizedDefault);
      }
    }, [updateJuceValue]);

  // Global mouse event management for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup cursor style on component unmount
  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

  // Memoized styles
  const styles = useMemo(
    () => ({
      wrapper: {
        padding: "0 10px",
        ...(isDragging && {
          cursor: "none !important" as const,
          "& *": {
            cursor: "none !important" as const,
          },
        }),
      } as CSSProperties,

      knob: {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        backgroundColor: primaryColor,
        border: `2px solid ${primaryColor}`,
        position: "relative" as const,
        cursor: isDragging ? "none" : "pointer",
        userSelect: "none",
        transform: `rotate(${rotationAngle}deg)`,
        transition: isDragging ? "none" : "transform 0.1s ease-out",

        "&:hover": {
          opacity: 0.9,
        },
        "&:active": {
          opacity: 0.8,
        },
      } as CSSProperties,

      indicator: {
        position: "absolute",
        top: "10%",
        left: "50%",
        width: "2px",
        height: "40%",
        backgroundColor: accentColor,
        borderRadius: "2px",
        transform: "translateX(-50%)",
      } as CSSProperties,

      valueDisplay: {
        width: "20px",
        fontSize: "10px",
        color: primaryColor,
        marginTop: "2px",
      },
    }),
    [size, primaryColor, accentColor, rotationAngle, isDragging]
  );

  return (
    <Flex justify="center" align="center" gap="small" style={styles.wrapper}>
      <div style={styles.knob} onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick}>
        <div style={styles.indicator} />
      </div>

      <div style={styles.valueDisplay}>{actualValue.toFixed(0)}</div>
    </Flex>
  );
};

export default JuceKnob;
