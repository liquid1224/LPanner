import React, { type FC, useEffect, useRef, useState } from "react";
// @ts-expect-error Juce does not have types
import { getSliderState } from "juce-framework-frontend";
import { Flex, Slider } from "antd";
import "./JuceSlider.css";

interface JuceSliderProps {
  identifier: string;
  isVertical?: boolean;
  min?: number;
  max?: number;
  mark?: number;
  defaultColor: string;
  accentColor: string;
}

const JuceSlider: FC<JuceSliderProps> = ({ identifier, isVertical = false, min = 0.0, max = 1.0, mark = 0.5, defaultColor, accentColor }) => {
  const sliderState = getSliderState(identifier);
  const [normalizedValue, setNormalizedValue] = useState(sliderState.getNormalisedValue());
  const [inputValue, setInputValue] = useState("");
  const [lastValidInput, setLastValidInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const range = max - min;
  const actualValue = normalizedValue * range + min;

  // 実際の値を文字列に変換（0埋めを除去）
  const formatValue = (value: number): string => {
    return value.toFixed(0).replace(/^0+(\d)/, "$1");
  };

  // 文字列を正規化された値に変換
  const valueToNormalized = (value: number): number => {
    return (value - min) / range;
  };

  // 値を範囲内にクランプ
  const clampValue = (value: number): number => {
    return Math.max(min, Math.min(max, value));
  };

  // 入力値が有効かチェック
  const isNumericInput = (input: string): boolean => {
    if (input === "" || !/^-?\d*\.?\d*$/.test(input)) return false;
    const parsed = parseFloat(input);
    return !isNaN(parsed);
  };

  // JUCEとの同期
  useEffect(() => {
    const handleStateChange = () => {
      const newValue = sliderState.getNormalisedValue();
      setNormalizedValue(newValue);
    };

    const listenerId = sliderState.valueChangedEvent.addListener(handleStateChange);
    return () => sliderState.valueChangedEvent.removeListener(listenerId);
  }, [sliderState]);

  // 正規化された値が変更されたときの入力フィールド更新
  useEffect(() => {
    const formatted = formatValue(actualValue);
    setInputValue(formatted);
    setLastValidInput(formatted);
  }, [actualValue]);

  const updateJuceValue = (normalized: number) => {
    sliderState.setNormalisedValue(normalized);
  };

  const handleSliderChange = (value: number) => {
    updateJuceValue(value);
  };

  const handleDoubleClick = () => {
    updateJuceValue(mark);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (isNumericInput(value)) {
      const parsedValue = parseFloat(value);
      const clampedValue = clampValue(parsedValue);
      setLastValidInput(formatValue(clampedValue));
    }
  };

  const confirmInput = () => {
    if (isNumericInput(inputValue)) {
      const parsedValue = parseFloat(inputValue);
      const clampedValue = clampValue(parsedValue);
      const formatted = formatValue(clampedValue);

      setInputValue(formatted);
      setLastValidInput(formatted);
      updateJuceValue(valueToNormalized(clampedValue));
    } else {
      // 無効な入力の場合は最後の有効な値に戻す
      setInputValue(lastValidInput);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      confirmInput();
      inputRef.current?.blur();
    }
  };

  const handleInputFocus = () => {
    inputRef.current?.select();
  };

  // スライダーの色を動的に設定
  const getSliderColors = () => ({
    "--default-color": normalizedValue < 0.5 ? defaultColor : "#ccc",
    "--accent-color": normalizedValue >= 0.5 ? accentColor : "#ccc",
  });

  return (
    <Flex className="juce-slider-wrapper" vertical justify="center" align="center" gap="middle">
      <div style={{ width: "100%", ...getSliderColors() } as React.CSSProperties} onDoubleClick={handleDoubleClick}>
        <Slider className="juce-slider" vertical={isVertical} min={0} max={1} step={0.005} value={normalizedValue} marks={{ [mark]: " " }} onChange={handleSliderChange} tooltip={{ open: false }} />
      </div>

      <Flex>
        <input
          ref={inputRef}
          type="text"
          className="juce-slider-input"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={confirmInput}
          onFocus={handleInputFocus}
        />
      </Flex>
    </Flex>
  );
};

export default JuceSlider;
