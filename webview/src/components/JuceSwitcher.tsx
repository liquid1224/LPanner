import { type FC, useEffect, useRef, useState } from "react";
// @ts-expect-error Juce does not have types
import { getComboBoxState } from "juce-framework-frontend";
import { Flex, Typography } from "antd";

interface JuceSwitcherProps {
  identifier: string;
  titles: string[];
  level?: 1 | 2 | 3 | 4 | 5;
  style?: React.CSSProperties;
  className?: string;
  hoverLockDuration?: number;
  onChange?: (index: boolean) => void;
}

const JuceSwitcher: FC<JuceSwitcherProps> = ({ identifier, titles, level, style, className, hoverLockDuration = 500, onChange }) => {
  const comboBoxState = getComboBoxState(identifier);
  const [currentIndex, setCurrentIndex] = useState(comboBoxState.getChoiceIndex());
  const [isHovered, setIsHovered] = useState(false);
  const [isHoverLocked, setIsHoverLocked] = useState(false);
  const isMouseOverRef = useRef(false);

  useEffect(() => {
    const handleValueChange = () => setCurrentIndex(comboBoxState.getChoiceIndex());
    const listenerId = comboBoxState.valueChangedEvent.addListener(handleValueChange);

    return () => comboBoxState.valueChangedEvent.removeListener(listenerId);
  }, [comboBoxState]);

  const handleMouseEnter = () => {
    isMouseOverRef.current = true;
    if (!isHoverLocked) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    isMouseOverRef.current = false;
    setIsHovered(false);
  };

  const handleClick = () => {
    const newIndex = currentIndex === 0 ? 1 : 0;
    const newIndexBool = currentIndex === 0 ? true : false;
    comboBoxState.setChoiceIndex(newIndex);

    if (onChange) {
      onChange(newIndexBool);
    }

    // クリック後のホバーロック処理
    setIsHovered(false);
    setIsHoverLocked(true);

    setTimeout(() => {
      setIsHoverLocked(false);
      // マウスがまだ要素上にある場合はホバー状態を復元
      if (isMouseOverRef.current) {
        setIsHovered(true);
      }
    }, hoverLockDuration);
  };

  const nextIndex = currentIndex === 0 ? 1 : 0;
  const displayIndex = isHovered ? nextIndex : currentIndex;
  const shouldShowPreview = isHovered && !isHoverLocked;

  return (
    <Flex
      justify="start"
      align="center"
      className="stereo-selector"
      style={{ width: "150px", cursor: "pointer" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <Typography.Title
        level={level}
        style={{
          ...style,
          scale: shouldShowPreview ? 0.8 : 1.0,
          color: shouldShowPreview ? "#575252" : "#3e3737",
          transition: "color 0.2s, scale 0.2s",
        }}
        className={className}
      >
        {titles[displayIndex]}
      </Typography.Title>
    </Flex>
  );
};

export default JuceSwitcher;
