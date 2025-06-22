import { useEffect, useState, type FC } from "react";
import { Layout, Flex, Typography } from "antd";
// @ts-expect-error Juce does not have types
import { getNativeFunction } from "juce-framework-frontend";
import "@fontsource/zen-dots/index.css";
import "./App.css";
import JuceSwitcher from "./components/JuceSwitcher";
import JuceSlider from "./components/JuceSlider";
import JuceKnob from "./components/JuceKnob";
import JuceBypassButton from "./components/JuceBypassButton";

// デザインテーマの定数
const THEME = {
  colors: {
    background: "#9c7474",
    primary: "#3e3737",
    accent: "#9c3e3e",
    secondary: "#575252",
  },
  spacing: {
    container: "25px 40px",
  },
} as const;

// コンポーネントのスタイル定数
const STYLES = {
  title: {
    margin: "0",
    fontWeight: "normal" as const,
    color: THEME.colors.primary,
  },
  versionText: {
    fontSize: "8px",
    color: THEME.colors.primary,
  },
  subtitle: {
    margin: "0",
    fontWeight: "normal" as const,
    color: THEME.colors.primary,
  },
  delayTitle: {
    margin: 0,
    fontWeight: "normal" as const,
    fontSize: "18px",
    color: THEME.colors.primary,
  },
} as const;

const App: FC = () => {
  const [isModern, setIsModern] = useState<boolean>(false);

  // 初期化：Stereo Modeの状態を取得
  useEffect(() => {
    const initializeStereoMode = async () => {
      try {
        // @ts-expect-error Juce does not have types
        const { getComboBoxState } = await import("juce-framework-frontend");
        const stereoModeState = getComboBoxState("stereoMode");
        const initialIndex = stereoModeState.getChoiceIndex();
        setIsModern(initialIndex === 1);
      } catch (error) {
        console.error("Failed to initialize stereo mode:", error);
      }
    };

    initializeStereoMode();
  }, []);

  // スペースキー検出
  useEffect(() => {
    const pressSpaceKey = getNativeFunction("pressSpaceKey");

    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.code === "Space") {
        try {
          await pressSpaceKey();
          console.log("Space key pressed");
        } catch (error) {
          console.error("Failed to handle space key press:", error);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ズーム無効化
  useEffect(() => {
    const disableZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    const disableKeyZoom = (e: KeyboardEvent) => {
      const zoomKeys = [";", "+", "-", "=", "_"];
      if (e.ctrlKey && zoomKeys.includes(e.key)) {
        e.preventDefault();
      }
    };

    window.addEventListener("wheel", disableZoom, { passive: false });
    window.addEventListener("keydown", disableKeyZoom);

    return () => {
      window.removeEventListener("wheel", disableZoom);
      window.removeEventListener("keydown", disableKeyZoom);
    };
  }, []);

  const handleStereoModeChange = (index: boolean) => {
    setIsModern(index);
  };

  // ヘッダーセクション
  const renderHeader = () => (
    <Flex align="center" gap="middle">
      <Typography.Title level={1} style={STYLES.title}>
        LPanner
      </Typography.Title>
      <Typography.Text style={STYLES.versionText}>
        Ver 1.0.1 <br />
        by liquid1224
      </Typography.Text>
      <JuceBypassButton identifier="bypass" />
    </Flex>
  );

  // Stereo Modeセクション
  const renderStereoSection = () => (
    <Flex justify="space-between" align="center" style={{ width: "100%" }}>
      <Flex gap="middle">
        <Typography.Title level={2} style={STYLES.subtitle}>
          Stereo Image:
        </Typography.Title>
        <JuceSwitcher identifier="stereoMode" titles={["Classic", "Modern"]} level={2} style={STYLES.subtitle} className="stereo-selector-text" onChange={handleStereoModeChange} />
      </Flex>
      {isModern && (
        <Flex align="start">
          <Typography.Title level={3} style={STYLES.delayTitle}>
            Delay Time
          </Typography.Title>
          <JuceKnob identifier="delay" min={1.0} max={20.0} defaultValue={5.0} defaultColor={THEME.colors.primary} accentColor={THEME.colors.accent} size={20} />
        </Flex>
      )}
    </Flex>
  );

  // Stereoスライダーセクション
  const renderStereoSlider = () => <JuceSlider identifier="stereo" min={0} max={200} mark={0.5} defaultColor={THEME.colors.secondary} accentColor={THEME.colors.accent} />;

  // Rotationセクション
  const renderRotationSection = () => (
    <>
      <Typography.Title level={2} style={STYLES.subtitle}>
        Rotation
      </Typography.Title>
      <JuceSlider identifier="rotation" min={-50} max={50} mark={0.5} defaultColor={THEME.colors.secondary} accentColor={THEME.colors.accent} />
    </>
  );

  return (
    <Layout className="root">
      <Flex
        vertical
        gap="middle"
        justify="space-between"
        align="start"
        style={{
          padding: THEME.spacing.container,
          height: "100vh",
          background: THEME.colors.background,
        }}
      >
        {renderHeader()}
        {renderStereoSection()}
        {renderStereoSlider()}
        {renderRotationSection()}
      </Flex>
    </Layout>
  );
};

export default App;
