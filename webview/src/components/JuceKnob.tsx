import React, { type FC, useEffect, useState, useCallback, useMemo, useRef, type CSSProperties } from "react";
// @ts-expect-error Juce does not have types
import { getSliderState } from "juce-framework-frontend";
import { Flex } from "antd";
import styled from "styled-components";

// Constants
const KNOB_ROTATION_RANGE = 270;
const DEFAULT_SIZE = 60;
const DEFAULT_SENSITIVITY = 0.005;
const CTRL_SENSITIVITY_FACTOR = 0.1;
const INDICATOR_HEIGHT_RATIO = 0.4;
const INDICATOR_WIDTH = 2;

// Types
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
  disabled?: boolean;
  title?: string;
  suffix?: string;
}

interface DragState {
  isDragging: boolean;
  startY: number;
  startValue: number;
}

// Styled Components
const KnobTitle = styled.div<{ $primaryColor: string }>`
  margin: 0;
  font-weight: normal;
  font-size: 18px;
  color: ${(props) => props.$primaryColor};
`;

const KnobInput = styled.input<{
  $primaryColor: string;
  $secondaryColor: string;
  $disabled?: boolean;
}>`
  width: 40px;
  font-family: inherit;
  font-size: 10px;
  margin-top: 3px;
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

const KnobSuffix = styled.div<{ $primaryColor: string }>`
  font-weight: normal;
  font-size: 10px;
  margin-top: 3px;
  color: ${(props) => props.$primaryColor};
`;

const KnobContainer = styled.div<{
  $size: number;
  $primaryColor: string;
  $isDragging: boolean;
}>`
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: 50%;
  background-color: ${(props) => props.$primaryColor};
  border: 2px solid ${(props) => props.$primaryColor};
  position: relative;
  cursor: ${(props) => (props.$isDragging ? "none" : "grab")};
  user-select: none;
`;

const KnobIndicator = styled.div<{ $accentColor: string }>`
  position: absolute;
  top: "10%";
  left: 50%;
  width: ${INDICATOR_WIDTH}px;
  height: ${INDICATOR_HEIGHT_RATIO * 100}%;
  background-color: ${(props) => props.$accentColor};
  border-radius: 2px;
  transform: translateX(-50%);
`;

// Custom Hooks
const useDragState = () => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startY: 0,
    startValue: 0,
  });

  const startDrag = useCallback((clientY: number, currentValue: number) => {
    setDragState({
      isDragging: true,
      startY: clientY,
      startValue: currentValue,
    });
  }, []);

  const endDrag = useCallback(() => {
    setDragState((prev) => ({ ...prev, isDragging: false }));
  }, []);

  // Ctrlキーの状態変化時に基準値を再設定するための関数
  const updateDragBase = useCallback((currentY: number, currentValue: number) => {
    setDragState((prev) => ({
      ...prev,
      startY: currentY,
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

    // Handle window focus/blur to reset ctrl state
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
    return value.toFixed(1).replace(/^0+(\d)/, "$1");
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

const calculateRotationAngle = (normalizedValue: number): number => {
  return (normalizedValue - 0.5) * KNOB_ROTATION_RANGE;
};

// Main Component
const JuceKnob: FC<JuceKnobProps> = ({
  identifier,
  min = 0.0,
  max = 1.0,
  defaultValue = 0.5,
  size = DEFAULT_SIZE,
  sensitivity = DEFAULT_SENSITIVITY,
  primaryColor,
  secondaryColor,
  accentColor,
  disabled = false,
  title,
  suffix,
}) => {
  // JUCE state
  const sliderState = useMemo(() => getSliderState(identifier), [identifier]);
  const [normalizedValue, setNormalizedValue] = useState(() => sliderState.getNormalisedValue());

  // Custom hooks
  const { dragState, startDrag, endDrag, updateDragBase } = useDragState();
  const isCtrlPressed = useCtrlKeyDetection();
  const actualValue = useMemo(() => denormalizeValue(normalizedValue, min, max), [normalizedValue, min, max]);

  const { inputValue, setInputValue, lastValidInput, setLastValidInput, inputRef, formatValue } = useInputState(actualValue);

  // Ctrlキーの前回の状態を記録
  const prevCtrlPressedRef = useRef(isCtrlPressed);
  const lastMouseYRef = useRef(0);

  // Calculated values
  const rotationAngle = useMemo(() => calculateRotationAngle(normalizedValue), [normalizedValue]);
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

  // Ctrlキーの状態変化を監視し、ドラッグ中であれば基準値を更新
  useEffect(() => {
    if (dragState.isDragging && prevCtrlPressedRef.current !== isCtrlPressed) {
      updateDragBase(lastMouseYRef.current, normalizedValue);
    }
    prevCtrlPressedRef.current = isCtrlPressed;
  }, [isCtrlPressed, dragState.isDragging, normalizedValue, updateDragBase]);

  // Mouse drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      e.preventDefault();
      startDrag(e.clientY, normalizedValue);
      lastMouseYRef.current = e.clientY;
    },
    [disabled, startDrag, normalizedValue]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState.isDragging || disabled) return;

      e.preventDefault();
      lastMouseYRef.current = e.clientY;

      const deltaY = dragState.startY - e.clientY;
      const valueChange = deltaY * effectiveSensitivity;
      const newValue = dragState.startValue + valueChange;

      updateJuceValue(newValue);
    },
    [dragState, effectiveSensitivity, updateJuceValue, disabled]
  );

  const handleMouseUp = useCallback(() => {
    if (!dragState.isDragging) return;
    endDrag();
  }, [dragState.isDragging, endDrag]);

  const handleDoubleClick = useCallback(() => {
    if (disabled) return;

    const normalizedDefault = normalizeValue(defaultValue, min, max);
    updateJuceValue(normalizedDefault);
  }, [disabled, defaultValue, min, max, updateJuceValue]);

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

  // Styles
  const knobStyle: CSSProperties = useMemo(
    () => ({
      transform: `rotate(${rotationAngle}deg)`,
      transition: dragState.isDragging ? "none" : "transform 0.1s ease-out",
    }),
    [rotationAngle, dragState.isDragging]
  );

  const wrapperStyle: CSSProperties = useMemo(
    () => ({
      padding: "0 0 0 15px",
      alignItems: "center",
    }),
    []
  );

  return (
    <Flex align="center" style={{ opacity: disabled ? 0 : 1, transition: "opacity 0.1s ease-out" }}>
      <Flex align="end">
        <KnobTitle $primaryColor={primaryColor}>{title}</KnobTitle>
      </Flex>

      <Flex justify="center" align="center" gap={2} style={wrapperStyle}>
        <KnobContainer $size={size} $primaryColor={primaryColor} $isDragging={dragState.isDragging} style={knobStyle} onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick}>
          <KnobIndicator $accentColor={accentColor} />
        </KnobContainer>

        <KnobInput
          ref={inputRef}
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
        <KnobSuffix $primaryColor={primaryColor}>{suffix}</KnobSuffix>
      </Flex>
    </Flex>
  );
};

export default JuceKnob;
