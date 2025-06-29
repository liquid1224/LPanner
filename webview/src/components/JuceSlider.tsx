import React, { type FC, useEffect, useRef, useState } from "react";
import styled from "styled-components";
// @ts-expect-error Juce does not have types
import { getSliderState } from "juce-framework-frontend";
import { Flex, Slider } from "antd";

interface JuceSliderProps {
  identifier: string;
  isVertical?: boolean;
  min?: number;
  max?: number;
  mark?: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  centerOrigin?: boolean;
}

interface SliderWrapperProps {
  $primaryColor: string;
  $secondaryColor: string;
  $accentColor: string;
  $normalizedValue: number;
  $centerOrigin: boolean;
}

interface CustomTrackProps {
  $accentColor: string;
  $trackLeft: number;
  $trackWidth: number;
}

const SliderWrapper = styled(Flex)<SliderWrapperProps>`
  width: 100%;
  padding: 0 40px;

  // Override .ant-slider
  && .ant-slider {
    width: 100%;
    padding: 0;
    margin-top: 0;
  }

  // Override .ant-slider-rail
  && .ant-slider-rail {
    border-radius: 10px;
    background-color: ${(props) => props.$secondaryColor} !important;
  }

  // Override .ant-slider-track
  && .ant-slider-track {
    background-color: ${(props) => (props.$centerOrigin ? "transparent" : props.$accentColor)} !important;
    border-radius: 10px;
  }

  // Override .ant-slider-dot
  && .ant-slider-dot {
    inset-block-start: -7px;
    width: 12px;
    height: 12px;
    box-shadow: none;
    border: none;
    background-color: ${(props) => (props.$centerOrigin ? props.$accentColor : props.$normalizedValue < 0.5 ? props.$secondaryColor : props.$accentColor)} !important;
  }

  // Override .ant-slider-handle
  && .ant-slider-handle {
    width: 80px;
    height: 50px;
    transform: translate(-50%, calc(-50% + 4px)) !important;
    inset-block-start: 0;
    z-index: 2;
  }

  && .ant-slider-handle::before {
    width: 100%;
    height: 100%;
    inset-inline-start: 0;
    inset-block-start: 0;
    background-color: ${(props) => props.$primaryColor};
    border-radius: 25px;
  }

  && .ant-slider-handle::after {
    width: 4px;
    height: 100%;
    inset-inline-start: calc(50% - 2px);
    inset-block-start: 0;
    background-color: ${(props) => props.$accentColor};
    border-radius: 0;
    box-shadow: 0px 10px 10px -6px transparent;
    outline: none;
  }

  && .ant-slider-handle:hover::after {
    outline: none;
    box-shadow: 0px 10px 10px -6px rgba(0, 0, 0, 0.3);
  }
`;

// Style for input field
const SliderInput = styled.input<{ $primaryColor: string; $secondaryColor: string }>`
  width: 120px;
  font-family: inherit;
  font-size: 24px;
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

// Style for centerOrigin custom track
const CustomTrack = styled.div<CustomTrackProps>`
  position: absolute;
  top: 2px;
  left: ${(props) => props.$trackLeft}%;
  width: ${(props) => props.$trackWidth}%;
  height: 4px;
  background-color: ${(props) => props.$accentColor};
  border-radius: 10px;
  transform: translateY(-50%);
  z-index: 1;
`;

const SliderContainer = styled.div`
  width: 100%;
  position: relative;
`;

const JuceSlider: FC<JuceSliderProps> = ({ identifier, isVertical = false, min = 0.0, max = 1.0, mark = 0.5, primaryColor, secondaryColor, accentColor, centerOrigin = false }) => {
  // Get JUCE slider state
  const sliderState = getSliderState(identifier);

  // Component States
  const [normalizedValue, setNormalizedValue] = useState(sliderState.getNormalisedValue());
  const [inputValue, setInputValue] = useState("");
  const [lastValidInput, setLastValidInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate range and actual value
  const range = max - min;
  const actualValue = normalizedValue * range + min;

  // Format number to string and delete leading zeros
  const formatValue = (value: number): string => {
    return value.toFixed(0).replace(/^0+(\d)/, "$1");
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

  // Sync component state with JUCE state
  useEffect(() => {
    const handleStateChange = () => {
      const newValue = sliderState.getNormalisedValue();
      setNormalizedValue(newValue);
    };

    const listenerId = sliderState.valueChangedEvent.addListener(handleStateChange);
    return () => sliderState.valueChangedEvent.removeListener(listenerId);
  }, [sliderState]);

  // Update input field when normalized value changes
  useEffect(() => {
    const formatted = formatValue(actualValue);
    setInputValue(formatted);
    setLastValidInput(formatted);
  }, [actualValue]);

  // Update JUCE parameter with normalized value
  const updateJuceValue = (normalized: number) => {
    sliderState.setNormalisedValue(normalized);
  };

  // updateJuceValue when slider value changes
  const handleSliderChange = (value: number) => {
    updateJuceValue(value);
  };

  // Handle double click to reset to default value
  const handleDoubleClick = () => {
    updateJuceValue(mark);
  };

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

  // Calculate custom track properties for centerOrigin
  const getCustomTrackProps = () => {
    const centerNormalized = mark; // mark represents the center point
    const currentNormalized = normalizedValue;

    const trackStart = Math.min(centerNormalized, currentNormalized);
    const trackEnd = Math.max(centerNormalized, currentNormalized);
    const trackWidth = (trackEnd - trackStart) * 100;
    const trackLeft = trackStart * 100;

    return {
      $accentColor: accentColor,
      $trackLeft: trackLeft,
      $trackWidth: trackWidth,
    };
  };

  return (
    <SliderWrapper
      vertical
      justify="center"
      align="center"
      gap="middle"
      $primaryColor={primaryColor}
      $secondaryColor={secondaryColor}
      $accentColor={accentColor}
      $normalizedValue={normalizedValue}
      $centerOrigin={centerOrigin}
    >
      <SliderContainer onDoubleClick={handleDoubleClick}>
        {/* Render custom track for center-origin mode */}
        {centerOrigin && <CustomTrack {...getCustomTrackProps()} />}

        {/* Ant Design Slider component */}
        <Slider className="juce-slider" vertical={isVertical} min={0} max={1} step={0.005} value={normalizedValue} marks={{ [mark]: " " }} onChange={handleSliderChange} tooltip={{ open: false }} />
      </SliderContainer>

      {/* Value input field */}
      <Flex>
        <SliderInput
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
    </SliderWrapper>
  );
};

export default JuceSlider;
