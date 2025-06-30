import React, { type FC, useEffect, useState, useCallback, useMemo, useRef, type CSSProperties } from "react";
// @ts-expect-error Juce does not have types
import { getSliderState } from "juce-framework-frontend";
import { Flex } from "antd";
import styled from "styled-components";

interface JuceKnobProps {
  identifier: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  size?: number;
  sensitivity?: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

// Styled input field
const KnobInput = styled.input<{ $primaryColor: string; $secondaryColor: string }>`
  width: 40px;
  font-family: inherit;
  font-size: 10px;
  border: none;
  background-color: inherit;
  text-align: center;
  color: ${(props) => props.$primaryColor};
  &:focus {
    border: none;
    outline: none;
    color: ${(props) => props.$secondaryColor};
  }
`;

const JuceKnob: FC<JuceKnobProps> = ({ identifier, min = 0.0, max = 1.0, defaultValue = 0.5, size = 60, sensitivity = 0.5, primaryColor, secondaryColor, accentColor }) => {
  // Get JUCE slider state
  const sliderState = getSliderState(identifier);

  // Component states
  const [normalizedValue, setNormalizedValue] = useState(sliderState.getNormalisedValue());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [lastValidInput, setLastValidInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate actual value from normalized value to min ~ max range
  const range = max - min;
  const actualValue = normalizedValue * range + min;

  // Calculate knob rotation angle（-135deg ~ +135deg）
  const rotationAngle = (normalizedValue - 0.5) * 270;

  // Format number to string and delete leading zeros
  const formatValue = (value: number): string => {
    return value.toFixed(1).replace(/^0+(\d)/, "$1");
  };

  // Convert string to normalized number
  const valueToNormalized = (value: number): number => {
    return (value - min) / range;
  };

  // Clamp number in range
  const clampValue = (value: number): number => {
    return Math.max(min, Math.min(max, value));
  };

  // Check if input is valid
  const isNumericInput = (input: string): boolean => {
    if (input === "" || !/^-?\d*\.?\d*$/.test(input)) return false;
    const parsed = parseFloat(input);
    return !isNaN(parsed);
  };

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

  // Update input field when normalized value changes
  useEffect(() => {
    const formatted = formatValue(actualValue);
    setInputValue(formatted);
    setLastValidInput(formatted);
  }, [actualValue]);

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
    [isDragging, dragStartY, dragStartValue, sensitivity, updateJuceValue]
  );

  // Handle mouse up event to end dragging
  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    // Show cursor
    document.body.style.cursor = "";
  }, [isDragging]);

  // Handle double click to reset default value
  const handleDoubleClick = useCallback(() => {
    const normalizedDefault = (defaultValue - min) / range;
    updateJuceValue(normalizedDefault);
  }, [defaultValue, min, range, updateJuceValue]);

  // Handle input field text change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Update lastValidInput if current input is numeric
    if (isNumericInput(value)) {
      const parsedValue = parseFloat(value);
      const clampedValue = clampValue(parsedValue);
      setLastValidInput(formatValue(clampedValue));
    }
  };

  // Confirm and apply input value changes
  const confirmInput = () => {
    if (isNumericInput(inputValue)) {
      const parsedValue = parseFloat(inputValue);
      const clampedValue = clampValue(parsedValue);
      const formatted = formatValue(clampedValue);

      setInputValue(formatted);
      setLastValidInput(formatted);
      updateJuceValue(valueToNormalized(clampedValue));
    } else {
      // Revert to last valid number if current input is invalid
      setInputValue(lastValidInput);
    }
  };

  // Handle Enter input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      confirmInput();
      inputRef.current?.blur();
    }
  };

  // Handle input field focus to select all text
  const handleInputFocus = () => {
    inputRef.current?.select();
  };

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
    }),
    [size, primaryColor, accentColor, rotationAngle, isDragging]
  );

  return (
    <Flex justify="center" align="center" gap="small" style={styles.wrapper}>
      <div style={styles.knob} onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick}>
        <div style={styles.indicator} />
      </div>

      <KnobInput
        ref={inputRef}
        type="text"
        value={inputValue}
        $primaryColor={primaryColor}
        $secondaryColor={secondaryColor}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        onBlur={confirmInput}
        onFocus={handleInputFocus}
      />
    </Flex>
  );
};

export default JuceKnob;
