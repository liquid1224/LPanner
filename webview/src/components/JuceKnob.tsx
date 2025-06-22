import React, { type FC, useEffect, useState, useCallback } from "react";
// @ts-expect-error Juce does not have types
import { getSliderState } from "juce-framework-frontend";
import { Flex } from "antd";
import "./JuceKnob.css";

interface JuceKnobProps {
  identifier: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  size?: number;
  sensitivity?: number;
  defaultColor?: string;
  accentColor?: string;
}

const JuceKnob: FC<JuceKnobProps> = ({ identifier, min = 0.0, max = 1.0, defaultValue = 0.5, size = 60, sensitivity = 0.5, defaultColor = "#666", accentColor = "#007bff" }) => {
  const sliderState = getSliderState(identifier);
  const [normalizedValue, setNormalizedValue] = useState(sliderState.getNormalisedValue());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(0);

  const range = max - min;
  const actualValue = normalizedValue * range + min;

  // ノブの回転角度（-135度から+135度の範囲）
  const rotationAngle = (normalizedValue - 0.5) * 270;

  // JUCE状態との同期
  useEffect(() => {
    const handleStateChange = () => {
      setNormalizedValue(sliderState.getNormalisedValue());
    };

    const listenerId = sliderState.valueChangedEvent.addListener(handleStateChange);
    return () => sliderState.valueChangedEvent.removeListener(listenerId);
  }, [sliderState]);

  const updateJuceValue = (normalized: number) => {
    const clampedValue = Math.max(0, Math.min(1, normalized));
    sliderState.setNormalisedValue(clampedValue);
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      setIsDragging(true);
      setDragStartY(e.clientY);
      setDragStartValue(normalizedValue);

      // ドラッグ中はカーソルを非表示
      document.body.style.cursor = "none";
    },
    [normalizedValue]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      e.preventDefault();

      const deltaY = dragStartY - e.clientY;
      const valueChange = (deltaY * sensitivity) / 100;
      const newValue = dragStartValue + valueChange;

      updateJuceValue(newValue);
    },
    [isDragging, dragStartY, dragStartValue, sensitivity]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    document.body.style.cursor = "";
  }, [isDragging]);

  const handleDoubleClick = () => {
    // defaultValueをmin-maxの範囲に正規化
    const normalizedDefault = (defaultValue - min) / range;
    updateJuceValue(normalizedDefault);
  };

  // グローバルマウスイベントの管理
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

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

  const knobStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    backgroundColor: defaultColor,
    border: `2px solid ${defaultColor}`,
    position: "relative",
    cursor: isDragging ? "none" : "pointer",
    userSelect: "none",
    transform: `rotate(${rotationAngle}deg)`,
    transition: isDragging ? "none" : "transform 0.1s ease-out",
  };

  const indicatorStyle: React.CSSProperties = {
    position: "absolute",
    top: "10%",
    left: "50%",
    width: "2px",
    height: "40%",
    backgroundColor: accentColor,
    borderRadius: "2px",
    transform: "translateX(-50%)",
  };

  const valueDisplayStyle: React.CSSProperties = {
    width: "20px",
    fontSize: "10px",
    color: "#3e3737",
    marginTop: "2px",
    fontFamily: "Zen Dots",
  };

  return (
    <Flex justify="center" align="center" gap="small" className="juce-knob-wrapper">
      <div style={knobStyle} onMouseDown={handleMouseDown} onDoubleClick={handleDoubleClick} className="juce-knob">
        <div style={indicatorStyle} />
      </div>

      <div style={valueDisplayStyle}>{actualValue.toFixed(0)}</div>
    </Flex>
  );
};

export default JuceKnob;
