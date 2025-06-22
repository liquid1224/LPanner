/*
  ==============================================================================

    This file contains the basic framework code for a JUCE plugin processor.

  ==============================================================================
*/

#pragma once

#include <JuceHeader.h>

//==============================================================================
/**
*/
class LPannerAudioProcessor  : public juce::AudioProcessor
{
public:
    //==============================================================================
    LPannerAudioProcessor();
    ~LPannerAudioProcessor() override;

    //==============================================================================
    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;

   #ifndef JucePlugin_PreferredChannelConfigurations
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;
   #endif

    template <typename T>
    void processBlockImpl(juce::AudioBuffer<T>& buffer, juce::MidiBuffer& midiMessages);

    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override {
        processBlockImpl(buffer, midiMessages);
    };
    void processBlock(juce::AudioBuffer<double>& buffer, juce::MidiBuffer& midiMessages) override {
        processBlockImpl(buffer, midiMessages);
	};

	bool supportsDoublePrecisionProcessing() const override { return true; }

    //==============================================================================
    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override;

    //==============================================================================
    const juce::String getName() const override;

    bool acceptsMidi() const override;
    bool producesMidi() const override;
    bool isMidiEffect() const override;
    double getTailLengthSeconds() const override;

    //==============================================================================
    int getNumPrograms() override;
    int getCurrentProgram() override;
    void setCurrentProgram (int index) override;
    const juce::String getProgramName (int index) override;
    void changeProgramName (int index, const juce::String& newName) override;

    //==============================================================================
    void getStateInformation (juce::MemoryBlock& destData) override;
    void setStateInformation (const void* data, int sizeInBytes) override;

    //==============================================================================
    juce::AudioProcessorValueTreeState parameters{
        *this,
        nullptr,
        juce::Identifier("PARAMETERS"),
        {
            std::make_unique<juce::AudioParameterFloat>("stereo", "stereo", juce::NormalisableRange<float>(0.0f, 200.0f, 1.0f, 1), 100.0f),
            std::make_unique<juce::AudioParameterChoice>("stereoMode", "stereoMode", juce::StringArray("classic", "modern"), 1),
            std::make_unique<juce::AudioParameterFloat>("delay", "delay", juce::NormalisableRange<float>(1.0f, 20.0f, 1.0f, 1), 5.0f),
            std::make_unique<juce::AudioParameterFloat>("rotation", "rotation", juce::NormalisableRange<float>(-50.0f,50.0f, 1.0f, 1), 0.0f),
			std::make_unique<juce::AudioParameterBool>("bypass", "bypass", false),
        }
    };
    juce::AudioProcessorParameter* getBypassParameter() const {
		return parameters.getParameter("bypass");
    }

private:
    std::atomic<float>* stereo = parameters.getRawParameterValue("stereo");
    std::atomic<float>* stereoMode = parameters.getRawParameterValue("stereoMode");
    std::atomic<float>* delay = parameters.getRawParameterValue("delay");
    std::atomic<float>* rotation = parameters.getRawParameterValue("rotation");
	std::atomic<float>* bypass = parameters.getRawParameterValue("bypass");

	juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> stereoSmoothed;
	juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> stereoModeSmoothed;
	juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> delaySmoothed;
	juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> rotationSmoothed;
    juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> dryWetSmoothed;

    juce::AudioBuffer<float> delayBufferF;
    juce::AudioBuffer<double> delayBufferD;

    template<typename T>
    struct BufferSelector;

    template<>
    struct BufferSelector<float> {
        juce::AudioBuffer<float>& getDelayBuffer(LPannerAudioProcessor& p) { return p.delayBufferF; };
    };

    template<>
    struct BufferSelector<double> {
        juce::AudioBuffer<double>& getDelayBuffer(LPannerAudioProcessor& p) { return p.delayBufferD; };
    };

	int writePosition = 0;
    int readPosition = 0;

    void updateParameters() {
		stereoSmoothed.setTargetValue(*stereo);
        stereoModeSmoothed.setTargetValue((!static_cast<int>(*stereoMode) || *stereo < 100.0f) ? 0.0f : 1.0f);
		delaySmoothed.setTargetValue(*delay);
		rotationSmoothed.setTargetValue(*rotation);
		dryWetSmoothed.setTargetValue(*bypass ? 0.0f : 1.0f);
    };

    //==============================================================================
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (LPannerAudioProcessor)
};
