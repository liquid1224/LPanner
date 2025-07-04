import React, { type FC, useEffect, useRef, useState, useCallback, useMemo } from "react";
import styled from "styled-components";
// @ts-expect-error Juce does not have types
import { getSliderState } from "juce-framework-frontend";

// Constants
const DEFAULT_SENSITIVITY = 0.002;
const CTRL_SENSITIVITY_FACTOR = 0.1;

interface JuceSliderProps {
  identifier: string;
  min?: number;
  max?: number;
  mark?: number;
  sensitivity?: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  centerOrigin?: boolean;
  disabled?: boolean;
}

interface SliderInputProps {
  $primaryColor: string;
  $secondaryColor: string;
  $disabled?: boolean;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startValue: number;
}

const SliderWrapper = styled.div`
  width: 100%;
  padding: 0 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
`;

// Styled input field
const SliderInput = styled.input<SliderInputProps>`
  width: 120px;
  font-family: inherit;
  font-size: 24px;
  border: none;
  background-color: inherit;
  text-align: center;
  color: ${(props) => props.$primaryColor};
  pointer-events: ${(props) => (props.$disabled ? "none" : "auto")};
  &:focus {
    border: none;
    outline: none;
    color: ${(props) => props.$secondaryColor};
  }
`;

// Styled centerOrigin custom track
const CustomTrack = styled.div`
  position: absolute;
  top: 50%;
  left: var(--track-left);
  width: var(--track-width);
  height: 4px;
  background-color: var(--accent-color);
  border-radius: 10px;
  transform: translateY(-50%);
  z-index: 1;
`;

const SliderContainer = styled.div<{ $disabled?: boolean; $isDragging: boolean }>`
  width: 100%;
  position: relative;
  height: 50px;
  display: flex;
  align-items: center;
  user-select: none;
`;

const SliderRail = styled.div`
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 4px;
  background-color: var(--secondary-color);
  border-radius: 10px;
  transform: translateY(-50%);
  z-index: 0;
`;

const SliderTrack = styled.div`
  position: absolute;
  top: 50%;
  left: 0;
  width: var(--track-width);
  height: 4px;
  background-color: var(--track-color);
  border-radius: 10px;
  transform: translateY(-50%);
  z-index: 1;
`;

const SliderHandle = styled.div<{ $disabled?: boolean; $isDragging: boolean }>`
  position: absolute;
  top: 50%;
  left: var(--handle-position);
  width: 80px;
  height: 50px;
  transform: translate(-50%, -50%);
  z-index: 2;
  transition: var(--handle-transition);
  cursor: ${(props) => (props.$isDragging ? "none" : "grab")};

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--primary-color);
    border-radius: 25px;
  }

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: calc(50% - 2px);
    width: 4px;
    height: 100%;
    background-color: var(--accent-color);
    border-radius: 0;
    box-shadow: 0px 10px 10px -6px transparent;
    transition: box-shadow 0.2s ease;
  }

  &:hover::after {
    box-shadow: ${(props) => (props.$disabled ? "none" : "0px 10px 10px -6px rgba(0, 0, 0, 0.3)")};
  }
`;

const SliderMark = styled.div`
  position: absolute;
  top: 50%;
  left: var(--mark-position);
  width: 12px;
  height: 12px;
  background-color: var(--mark-color);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
`;

// Custom Hooks
const useDragState = () => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startValue: 0,
  });

  const startDrag = useCallback((clientX: number, currentValue: number) => {
    setDragState({
      isDragging: true,
      startX: clientX,
      startValue: currentValue,
    });
  }, []);

  const endDrag = useCallback(() => {
    setDragState((prev) => ({ ...prev, isDragging: false }));
  }, []);

  const updateDragBase = useCallback((currentX: number, currentValue: number) => {
    setDragState((prev) => ({
      ...prev,
      startX: currentX,
      startValue: currentValue,
    }));
  }, []);

  return { dragState, startDrag, endDrag, updateDragBase };
};

const useCtrlKeyDetection = () => {
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && !isCtrlPressed) {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && isCtrlPressed) {
        setIsCtrlPressed(false);
      }
    };

    const handleWindowBlur = () => {
      setIsCtrlPressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isCtrlPressed]);

  return isCtrlPressed;
};

const useInputState = (actualValue: number) => {
  const [inputValue, setInputValue] = useState("");
  const [lastValidInput, setLastValidInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const formatValue = useCallback((value: number): string => {
    return value.toFixed(0).replace(/^0+(\d)/, "$1");
  }, []);

  // Update input when actual value changes
  useEffect(() => {
    const formatted = formatValue(actualValue);
    setInputValue(formatted);
    setLastValidInput(formatted);
  }, [actualValue, formatValue]);

  return {
    inputValue,
    setInputValue,
    lastValidInput,
    setLastValidInput,
    inputRef,
    formatValue,
  };
};

// Utility functions
const clampValue = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const isValidNumericInput = (input: string): boolean => {
  if (input === "" || !/^-?\d*\.?\d*$/.test(input)) return false;
  const parsed = parseFloat(input);
  return !isNaN(parsed);
};

const normalizeValue = (value: number, min: number, max: number): number => {
  return (value - min) / (max - min);
};

const denormalizeValue = (normalized: number, min: number, max: number): number => {
  return normalized * (max - min) + min;
};

const JuceSlider: FC<JuceSliderProps> = ({
  identifier,
  min = 0.0,
  max = 1.0,
  mark = 0.5,
  sensitivity = DEFAULT_SENSITIVITY,
  primaryColor,
  secondaryColor,
  accentColor,
  centerOrigin = false,
  disabled = false,
}) => {
  // JUCE state
  const sliderState = useMemo(() => getSliderState(identifier), [identifier]);
  const [normalizedValue, setNormalizedValue] = useState(() => sliderState.getNormalisedValue());

  // Custom hooks
  const { dragState, startDrag, endDrag, updateDragBase } = useDragState();
  const isCtrlPressed = useCtrlKeyDetection();
  const actualValue = useMemo(() => denormalizeValue(normalizedValue, min, max), [normalizedValue, min, max]);
  const { inputValue, setInputValue, lastValidInput, setLastValidInput, inputRef, formatValue } = useInputState(actualValue);

  // Refs for tracking state
  const prevCtrlPressedRef = useRef(isCtrlPressed);
  const lastMouseXRef = useRef(0);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // Calculate effective sensitivity
  const effectiveSensitivity = useMemo(() => {
    return isCtrlPressed ? sensitivity * CTRL_SENSITIVITY_FACTOR : sensitivity;
  }, [sensitivity, isCtrlPressed]);

  // JUCE integration
  const updateJuceValue = useCallback(
    (normalized: number) => {
      const clampedValue = clampValue(normalized, 0, 1);
      sliderState.setNormalisedValue(clampedValue);
    },
    [sliderState]
  );

  // Sync with JUCE state changes
  useEffect(() => {
    const handleStateChange = () => {
      setNormalizedValue(sliderState.getNormalisedValue());
    };

    const listenerId = sliderState.valueChangedEvent.addListener(handleStateChange);
    return () => sliderState.valueChangedEvent.removeListener(listenerId);
  }, [sliderState]);

  // Monitor Ctrl key state changes and update drag base if dragging
  useEffect(() => {
    if (dragState.isDragging && prevCtrlPressedRef.current !== isCtrlPressed) {
      updateDragBase(lastMouseXRef.current, normalizedValue);
    }
    prevCtrlPressedRef.current = isCtrlPressed;
  }, [isCtrlPressed, dragState.isDragging, normalizedValue, updateDragBase]);

  // Calculate CSS variables for dynamic styling
  const getCSSVariables = useCallback((): Record<string, string> => {
    const centerNormalized = mark;
    const currentNormalized = normalizedValue;

    // For centerOrigin mode
    const trackStart = Math.min(centerNormalized, currentNormalized);
    const trackEnd = Math.max(centerNormalized, currentNormalized);
    const customTrackWidth = (trackEnd - trackStart) * 100;
    const customTrackLeft = trackStart * 100;

    // Mark color logic
    const markColor = centerOrigin ? accentColor : normalizedValue < 0.5 ? secondaryColor : accentColor;

    return {
      "--primary-color": primaryColor,
      "--secondary-color": secondaryColor,
      "--accent-color": accentColor,
      "--handle-position": `${normalizedValue * 100}%`,
      "--handle-transition": dragState.isDragging ? "none" : "left 0.1s ease-out",
      "--track-width": centerOrigin ? "0%" : `${normalizedValue * 100}%`,
      "--track-color": centerOrigin ? "transparent" : accentColor,
      "--track-left": `${customTrackLeft}%`,
      "--custom-track-width": `${customTrackWidth}%`,
      "--mark-position": `${centerNormalized * 100}%`,
      "--mark-color": markColor,
    };
  }, [normalizedValue, mark, min, max, centerOrigin, accentColor, secondaryColor, primaryColor, dragState.isDragging]);

  // Mouse drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();
      startDrag(e.clientX, normalizedValue);
      lastMouseXRef.current = e.clientX;
    },
    [disabled, startDrag, normalizedValue]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState.isDragging || disabled) return;

      e.preventDefault();
      lastMouseXRef.current = e.clientX;

      const deltaX = e.clientX - dragState.startX;
      const valueChange = deltaX * effectiveSensitivity;
      const newValue = dragState.startValue + valueChange;

      updateJuceValue(newValue);
    },
    [dragState, effectiveSensitivity, updateJuceValue, disabled]
  );

  const handleMouseUp = useCallback(() => {
    if (!dragState.isDragging) return;
    endDrag();
  }, [dragState.isDragging, endDrag]);

  // Handle double click to reset to mark value
  const handleDoubleClick = useCallback(() => {
    if (disabled) return;
    const normalizedMark = mark;
    updateJuceValue(normalizedMark);
  }, [disabled, mark, min, max, updateJuceValue]);

  // Input handlers
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      if (isValidNumericInput(value)) {
        const parsedValue = parseFloat(value);
        const clampedValue = clampValue(parsedValue, min, max);
        setLastValidInput(formatValue(clampedValue));
      }
    },
    [min, max, formatValue, setInputValue, setLastValidInput]
  );

  const confirmInput = useCallback(() => {
    if (isValidNumericInput(inputValue)) {
      const parsedValue = parseFloat(inputValue);
      const clampedValue = clampValue(parsedValue, min, max);
      const formatted = formatValue(clampedValue);

      setInputValue(formatted);
      setLastValidInput(formatted);
      updateJuceValue(normalizeValue(clampedValue, min, max));
    } else {
      setInputValue(lastValidInput);
    }
  }, [inputValue, min, max, formatValue, lastValidInput, updateJuceValue, setInputValue, setLastValidInput]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        confirmInput();
        inputRef.current?.blur();
      }
    },
    [confirmInput]
  );

  const handleInputFocus = useCallback(() => {
    inputRef.current?.select();
  }, []);

  // Global mouse events for dragging
  useEffect(() => {
    if (dragState.isDragging) {
      document.body.style.setProperty("cursor", "none", "important");
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.body.style.removeProperty("cursor");
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  const cssVariables = getCSSVariables();

  return (
    <SliderWrapper style={{ ...cssVariables, opacity: disabled ? 0.5 : 1, transition: "opacity 0.1s ease-out" } as React.CSSProperties}>
      <SliderContainer ref={sliderContainerRef} $disabled={disabled} $isDragging={dragState.isDragging} onDoubleClick={handleDoubleClick}>
        {/* Slider rail (background track) */}
        <SliderRail />

        {/* Slider track (progress track) */}
        <SliderTrack />

        {/* Render custom track for center-origin mode */}
        {centerOrigin && (
          <CustomTrack
            style={
              {
                "--track-left": cssVariables["--track-left"],
                "--track-width": cssVariables["--custom-track-width"],
                "--accent-color": accentColor,
              } as React.CSSProperties
            }
          />
        )}

        {/* Slider mark */}
        <SliderMark />

        {/* Slider handle */}
        <SliderHandle $disabled={disabled} $isDragging={dragState.isDragging} onMouseDown={handleMouseDown} />
      </SliderContainer>

      {/* Value input field */}
      <div style={{ display: "flex" }}>
        <SliderInput
          ref={inputRef}
          type="text"
          value={inputValue}
          $primaryColor={primaryColor}
          $secondaryColor={secondaryColor}
          $disabled={disabled}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={confirmInput}
          onFocus={handleInputFocus}
          disabled={disabled}
        />
      </div>
    </SliderWrapper>
  );
};

export default JuceSlider;
