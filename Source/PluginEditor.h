/*
  ==============================================================================

    This file contains the basic framework code for a JUCE plugin editor.

  ==============================================================================
*/

#pragma once

#include <JuceHeader.h>
#include "PluginProcessor.h"
#define NOMINMAX
#include "Windows.h"

struct SinglePageBrowser : juce::WebBrowserComponent {
    using WebBrowserComponent::WebBrowserComponent;

    bool pageAboutToLoad(const juce::String& newURL) override {
        return newURL == juce::String("http://localhost:5173/") ||
            newURL == getResourceProviderRoot();
    }
};

//==============================================================================
/**
*/
class LPannerAudioProcessorEditor  : public juce::AudioProcessorEditor
{
public:
    LPannerAudioProcessorEditor (LPannerAudioProcessor&);
    ~LPannerAudioProcessorEditor() override;

    //==============================================================================
    void paint (juce::Graphics&) override;
    void resized() override;

	//==============================================================================
    int getControlParameterIndex(juce::Component&) override {
		return controlParameterIndexReceiver.getControlParameterIndex();
    }

private:
    // This reference is provided as a quick way for your editor to
    // access the processor object that created it.
    LPannerAudioProcessor& audioProcessor;

	//==============================================================================
	juce::WebControlParameterIndexReceiver controlParameterIndexReceiver;

    juce::WebSliderRelay stereoRelay{ "stereo" };
	juce::WebComboBoxRelay stereoModeRelay{ "stereoMode" };
	juce::WebSliderRelay delayRelay{ "delay" };
	juce::WebSliderRelay rotationRelay{ "rotation" };
	juce::WebToggleButtonRelay bypassRelay{ "bypass" };

	//===============================================================================
    SinglePageBrowser webComponent{
        juce::WebBrowserComponent::Options{}
            .withBackend(juce::WebBrowserComponent::Options::Backend::webview2)
            .withWinWebView2Options(
                juce::WebBrowserComponent::Options::WinWebView2{}
                    .withUserDataFolder(juce::File::getSpecialLocation(
                        juce::File::SpecialLocationType::tempDirectory)))
            .withOptionsFrom(stereoRelay)
            .withOptionsFrom(stereoModeRelay)
			.withOptionsFrom(delayRelay)
		    .withOptionsFrom(rotationRelay)
		    .withOptionsFrom(bypassRelay)
            .withOptionsFrom(controlParameterIndexReceiver)
            .withNativeFunction("pressSpaceKey",
                [this](auto& var, auto complete) {
                    DBG("pressSpaceKey");
                    // get window handle
                    auto hwnd = webComponent.getWindowHandle();

                    // setfocus
                    SetFocus(static_cast<HWND>(hwnd));

                    INPUT input;
                    input.type = INPUT_KEYBOARD;
                    input.ki.wVk = VK_SPACE;
                    SendInput(1, &input, sizeof(INPUT));
                    input.ki.dwFlags = KEYEVENTF_KEYUP;
                    SendInput(1, &input, sizeof(INPUT));

                    complete({});
            })
            .withResourceProvider(
                [this](const auto& url) { return getResource(url); },
                juce::URL{"http://localhost:5173/"}.getOrigin())};

    std::optional<juce::WebBrowserComponent::Resource> getResource(const juce::String& url);

    const char* getMimeForExtension(const juce::String& extension);

	//==============================================================================

    juce::WebSliderParameterAttachment stereoAttachment{*audioProcessor.parameters.getParameter("stereo"), stereoRelay, nullptr};
	juce::WebComboBoxParameterAttachment stereoModeAttachment{ *audioProcessor.parameters.getParameter("stereoMode"), stereoModeRelay, nullptr };
	juce::WebSliderParameterAttachment delayAttachment{ *audioProcessor.parameters.getParameter("delay"), delayRelay, nullptr };
	juce::WebSliderParameterAttachment rotationAttachment{ *audioProcessor.parameters.getParameter("rotation"), rotationRelay, nullptr };
	juce::WebToggleButtonParameterAttachment bypassAttachment{ *audioProcessor.parameters.getParameter("bypass"), bypassRelay, nullptr };

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (LPannerAudioProcessorEditor)
};
