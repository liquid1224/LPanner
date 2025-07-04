import { type FC, useEffect, useRef, useState } from "react";
// @ts-expect-error Juce does not have types
import { getToggleState } from "juce-framework-frontend";
import { FaPowerOff } from "react-icons/fa";

interface JuceBypassButtonProps {
  identifier: string;
  hoverLockDuration?: number;
  style: React.CSSProperties;
}

const JuceBypassButton: FC<JuceBypassButtonProps> = ({ identifier, hoverLockDuration = 500, style }) => {
  const toggleState = getToggleState(identifier);
  const [value, setValue] = useState(toggleState.getValue());
  const [isHovered, setIsHovered] = useState(false);
  const [isHoverLocked, setIsHoverLocked] = useState(false);
  const isMouseOverRef = useRef(false);
  const isBypassed = value === true;

  useEffect(() => {
    const handleValueChange = () => setValue(toggleState.getValue());
    const listenerId = toggleState.valueChangedEvent.addListener(handleValueChange);

    return () => toggleState.valueChangedEvent.removeListener(listenerId);
  }, [toggleState]);

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
    const newValue = value === false ? true : false;
    toggleState.setValue(newValue);

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

  const shouldShowHoverEffect = isHovered && !isHoverLocked;

  // 色の決定ロジック
  const getButtonColor = () => {
    if (shouldShowHoverEffect) {
      // ホバー時は色を薄く表示
      return "#525757";
    } else {
      // 通常時の色
      return isBypassed ? "#3e3737" : "#9c3e3e";
    }
  };

  const getIconScale = () => {
    return shouldShowHoverEffect ? 0.8 : 1.0;
  };

  return (
    <div
      className="bypass-button"
      style={{
        width: "32px",
        height: "32px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <FaPowerOff
        size={32}
        style={{
          color: getButtonColor(),
          transform: `scale(${getIconScale()})`,
          transition: "transform 0.2s, color 0.2s",
        }}
      />
    </div>
  );
};

export default JuceBypassButton;
