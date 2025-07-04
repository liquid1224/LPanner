import { Flex, Typography } from "antd";
import JuceBypassButton from "./JuceBypassButton";

interface HeaderProps {
  $primaryColor: string;
  pluginName: string;
  pluginVersion: string;
}

const Header = ({ $primaryColor, pluginName, pluginVersion }: HeaderProps) => {
  const STYLES = {
    title: {
      margin: "0",
      fontWeight: "normal" as const,
      color: $primaryColor,
    },
    versionText: {
      marginTop: "3px",
      fontSize: "8px",
      color: $primaryColor,
    },
    bypass: {
      marginBottom: "5px",
    },
  } as const;

  return (
    <Flex align="center" gap="middle">
      <Typography.Title level={1} style={STYLES.title}>
        {pluginName}
      </Typography.Title>
      <Typography.Text style={STYLES.versionText}>
        Ver {pluginVersion} <br />
        by liquid1224
      </Typography.Text>
      <JuceBypassButton identifier="bypass" style={STYLES.bypass} />
    </Flex>
  );
};

export default Header;
