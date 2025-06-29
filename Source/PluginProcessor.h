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
class LPannerAudioProcessor : public juce::AudioProcessor
{
public:
	//==============================================================================
	LPannerAudioProcessor();
	~LPannerAudioProcessor() override;

	//==============================================================================
	void prepareToPlay(double sampleRate, int samplesPerBlock) override;
	void releaseResources() override;

#ifndef JucePlugin_PreferredChannelConfigurations
	bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
#endif

	//==============================================================================
	void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;
	void processBlock(juce::AudioBuffer<double>& buffer, juce::MidiBuffer& midiMessages) override;
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
	void setCurrentProgram(int index) override;
	const juce::String getProgramName(int index) override;
	void changeProgramName(int index, const juce::String& newName) override;

	//==============================================================================
	void getStateInformation(juce::MemoryBlock& destData) override;
	void setStateInformation(const void* data, int sizeInBytes) override;

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
	// Consts
	static constexpr double SMOOTHING_TIME_MS = 10.0;
	static constexpr double DELAY_SECS = 2.0;
	static constexpr double PI = 3.14159265398979;

	// Params Refs
	std::atomic<float>* stereo = parameters.getRawParameterValue("stereo");
	std::atomic<float>* stereoMode = parameters.getRawParameterValue("stereoMode");
	std::atomic<float>* delay = parameters.getRawParameterValue("delay");
	std::atomic<float>* rotation = parameters.getRawParameterValue("rotation");
	std::atomic<float>* bypass = parameters.getRawParameterValue("bypass");

	// Smoothed Params
	juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> stereoSmoothed;
	juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> stereoModeSmoothed;
	juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> delaySmoothed;
	juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> rotationSmoothed;
	juce::SmoothedValue<float, juce::ValueSmoothingTypes::Linear> dryWetSmoothed;

	// Audio Processing State
	struct ProcessingState {
		float stereoWidth = 1.0f;
		float stereoMix = 0.0f;
		int delaySamples = 0;
		float cosTheta = 1.0f;
		float sinTheta = 0.0f;
		float wetMix = 1.0f;

		float f1 = 1.0f;
		float f2 = 0.0f;
		float leftClassicCoefficient1 = 1.0f, leftClassicCoefficient2 = 0.0f;
		float rightClassicCoefficient1 = 0.0f, rightClassicCoefficient2 = 1.0f;

		float leftModernCoefficient = 0.0f;
		float rightModernCoefficient = 0.0f;
	};

	// Delay Buffer
	juce::AudioBuffer<float> delayBufferF;
	juce::AudioBuffer<double> delayBufferD;
	int writePosition = 0;

	// Helper Methods
	void updateDelayBufferSize(double sampleRate);
	void setTargetValue();
	void updateParameterValues(ProcessingState& state);
	int calculateReadPosition(int delaySamples, int bufferSize) const;
	void incrementWritePosition(int bufferSize);

	// Template Methods
	template <typename T>
	void processBlockImpl(juce::AudioBuffer<T>& buffer, juce::MidiBuffer& midiMessages);

	template<typename T>
	juce::AudioBuffer<T>& getDelayBuffer();

	//==============================================================================
	JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(LPannerAudioProcessor)
};

template<>
inline juce::AudioBuffer<float>& LPannerAudioProcessor::getDelayBuffer<float>() {
	return delayBufferF;
}

template<>
inline juce::AudioBuffer<double>& LPannerAudioProcessor::getDelayBuffer<double>() {
	return delayBufferD;
}