import { useEffect, useState, type FC } from "react";
import { Layout, Flex, Typography } from "antd";
// @ts-expect-error Juce does not have types
import { getNativeFunction } from "juce-framework-frontend";
import "@fontsource/zen-dots/index.css";
import "./App.css";
import JuceSwitcher from "./components/JuceSwitcher";
import JuceSlider from "./components/JuceSlider";
import JuceKnob from "./components/JuceKnob";

const App: FC = () => {
  const [isModern, setIsModern] = useState<boolean>(false);
  useEffect(() => {
    // @ts-expect-error Juce does not have types
    import("juce-framework-frontend").then(({ getComboBoxState }) => {
      const stereoModeState = getComboBoxState("stereoMode");
      const initialIndex = stereoModeState.getChoiceIndex();
      setIsModern(initialIndex === 1);
    });
  }, []);

  // Detect Space
  useEffect(() => {
    const pressSpaceKey = getNativeFunction("pressSpaceKey");
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        pressSpaceKey().then(() => {
          console.log("Space key pressed");
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Disable zoom
  useEffect(() => {
    const disableZoom = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    const disableKeyZoom = (e: KeyboardEvent) => {
      if (e.ctrlKey && [";", "+", "-", "=", "_"].includes(e.key)) {
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

  return (
    <Layout className="root">
      <Flex vertical gap="middle" justify="space-between" align="start" style={{ padding: "25px 40px", height: "100vh", background: "#9c7474" }}>
        <Flex align="center" gap="middle">
          <Typography.Title level={1} style={{ margin: "0", fontWeight: "normal" }}>
            LPanner
          </Typography.Title>
          <Typography.Text style={{ fontSize: "10px" }}>
            Ver 1.0.0 <br />
            by liquid1224
          </Typography.Text>
        </Flex>
        <Flex justify="space-between" align="center" style={{ width: "100%" }}>
          <Flex gap="middle">
            <Typography.Title level={2} style={{ margin: "0", fontWeight: "normal" }}>
              Stereo Image:
            </Typography.Title>
            <JuceSwitcher
              identifier="stereoMode"
              titles={["Classic", "Modern"]}
              level={2}
              style={{ margin: "0", fontWeight: "normal" }}
              className="stereo-selector-text"
              onChange={handleStereoModeChange}
            />
          </Flex>
          {isModern && (
            <Flex align="start">
              <Typography.Title level={3} style={{ margin: 0, fontWeight: "normal", fontSize: "18px" }}>
                Delay Time
              </Typography.Title>
              <JuceKnob identifier="delay" min={1.0} max={20.0} defaultValue={5.0} defaultColor="#3e3737" accentColor="#9c3e3e" size={20} />
            </Flex>
          )}
        </Flex>
        <JuceSlider identifier="stereo" min={0} max={200} mark={0.5} defaultColor="#575252" accentColor="#9c3e3e" />
        <Typography.Title level={2} style={{ margin: "0", fontWeight: "normal" }}>
          Rotation
        </Typography.Title>
        <JuceSlider identifier="rotation" min={-50} max={50} mark={0.5} defaultColor="#575252" accentColor="#9c3e3e" />
      </Flex>
    </Layout>
  );
};

export default App;
