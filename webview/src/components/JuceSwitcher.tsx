import { type FC, useEffect, useRef, useState, useCallback, useMemo, type CSSProperties } from "react";
// @ts-expect-error Juce does not have types
import { getComboBoxState } from "juce-framework-frontend";
import { Flex, Typography } from "antd";

interface JuceSwitcherProps {
  identifier: string;
  titles: string[];
  level?: 1 | 2 | 3 | 4 | 5;
  primaryColor: string;
  secondaryColor: string;
  hoverLockDuration?: number;
  onChange?: (index: boolean) => void;
}

const JuceSwitcher: FC<JuceSwitcherProps> = ({ identifier, titles, level = 3, primaryColor, secondaryColor, hoverLockDuration = 500, onChange }) => {
  // Get JUCE combo box state
  const comboBoxState = getComboBoxState(identifier);

  // Component states
  const [currentIndex, setCurrentIndex] = useState(comboBoxState.getChoiceIndex());
  const [isHovered, setIsHovered] = useState(false);
  const [isHoverLocked, setIsHoverLocked] = useState(false);

  // Ref to track mouse position for hover state restoration
  const isMouseOverRef = useRef(false);

  // Memoized switcher state
  const switcherState = useMemo(() => {
    const nextIndex = currentIndex === 0 ? 1 : 0;
    const displayIndex = isHovered ? nextIndex : currentIndex;
    const shouldShowPreview = isHovered && !isHoverLocked;

    return {
      nextIndex,
      displayIndex,
      shouldShowPreview,
      currentTitle: titles[displayIndex] || titles[0] || "Unknown",
      nextIndexBoolean: currentIndex === 0,
    };
  }, [currentIndex, isHovered, isHoverLocked, titles]);

  // Memoized styles
  const styles = useMemo(
    () => ({
      container: {
        width: "150px",
        cursor: "pointer",
      } as CSSProperties,

      title: {
        scale: switcherState.shouldShowPreview ? 0.8 : 1.0,
        color: switcherState.shouldShowPreview ? secondaryColor : primaryColor,
        fontWeight: "normal" as const,
        transition: "color 0.2s ease-out, scale 0.2s ease-out",
        margin: 0,
        transformOrigin: "center",
      } as CSSProperties,
    }),
    [switcherState.shouldShowPreview]
  );

  // Sync component state with JUCE state
  useEffect(() => {
    const handleValueChange = () => setCurrentIndex(comboBoxState.getChoiceIndex());
    const listenerId = comboBoxState.valueChangedEvent.addListener(handleValueChange);

    return () => comboBoxState.valueChangedEvent.removeListener(listenerId);
  }, [comboBoxState]);

  // Handle mouse enter event to preview of next state
  const handleMouseEnter = useCallback(() => {
    isMouseOverRef.current = true;
    if (!isHoverLocked) setIsHovered(true);
  }, [isHoverLocked]);

  // Handle mouse leave event to hide preview
  const handleMouseLeave = useCallback(() => {
    isMouseOverRef.current = false;
    setIsHovered(false);
  }, []);

  // Handle click event to toggle switcher state
  const handleClick = useCallback(() => {
    const newIndex = switcherState.nextIndex;
    const newIndexBoolean = switcherState.nextIndexBoolean;

    // Update JUCE parameter
    comboBoxState.setChoiceIndex(newIndex);

    // Trigger onChange callback if provided
    if (onChange) onChange(newIndexBoolean);

    // Lock hover to prevent immediate hover state after click
    setIsHovered(false);
    setIsHoverLocked(true);

    // Unlock hover state
    setTimeout(() => {
      setIsHoverLocked(false);

      // Restore hover state if mouse is still over
      if (isMouseOverRef.current) setIsHovered(true);
    }, hoverLockDuration);
  }, [switcherState.nextIndex, switcherState.nextIndexBoolean, comboBoxState, onChange]);

  return (
    <Flex justify="start" align="center" style={styles.container} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} onClick={handleClick}>
      <Typography.Title level={level} style={styles.title}>
        {switcherState.currentTitle}
      </Typography.Title>
    </Flex>
  );
};

export default JuceSwitcher;
