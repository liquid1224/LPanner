/*
  ==============================================================================

	This file contains the basic framework code for a JUCE plugin processor.

  ==============================================================================
*/

#include "PluginProcessor.h"
#include "PluginEditor.h"

//==============================================================================
LPannerAudioProcessor::LPannerAudioProcessor()
#ifndef JucePlugin_PreferredChannelConfigurations
	: AudioProcessor(BusesProperties()
#if ! JucePlugin_IsMidiEffect
#if ! JucePlugin_IsSynth
		.withInput("Input", juce::AudioChannelSet::stereo(), true)
#endif
		.withOutput("Output", juce::AudioChannelSet::stereo(), true)
#endif
	)
#endif
{
}

LPannerAudioProcessor::~LPannerAudioProcessor()
{
}

//==============================================================================
const juce::String LPannerAudioProcessor::getName() const
{
	return JucePlugin_Name;
}

bool LPannerAudioProcessor::acceptsMidi() const
{
#if JucePlugin_WantsMidiInput
	return true;
#else
	return false;
#endif
}

bool LPannerAudioProcessor::producesMidi() const
{
#if JucePlugin_ProducesMidiOutput
	return true;
#else
	return false;
#endif
}

bool LPannerAudioProcessor::isMidiEffect() const
{
#if JucePlugin_IsMidiEffect
	return true;
#else
	return false;
#endif
}

double LPannerAudioProcessor::getTailLengthSeconds() const
{
	return 0.0;
}

int LPannerAudioProcessor::getNumPrograms()
{
	return 1;   // NB: some hosts don't cope very well if you tell them there are 0 programs,
	// so this should be at least 1, even if you're not really implementing programs.
}

int LPannerAudioProcessor::getCurrentProgram()
{
	return 0;
}

void LPannerAudioProcessor::setCurrentProgram(int index) {
	juce::ignoreUnused(index);
}

const juce::String LPannerAudioProcessor::getProgramName(int index) {
	juce::ignoreUnused(index);
	return {};
}

void LPannerAudioProcessor::changeProgramName(int index, const juce::String& newName) {
	juce::ignoreUnused(index, newName);
}

//==============================================================================
void LPannerAudioProcessor::prepareToPlay(double sampleRate, int samplesPerBlock) {
	juce::ignoreUnused(samplesPerBlock);

	double smoothingTimeSecs = SMOOTHING_TIME_MS * 0.001f;

	stereoSmoothed.reset(sampleRate, smoothingTimeSecs);
	stereoSmoothed.setCurrentAndTargetValue(*stereo);

	stereoModeSmoothed.reset(sampleRate, smoothingTimeSecs);
	stereoModeSmoothed.setCurrentAndTargetValue(*stereoMode);

	delaySmoothed.reset(sampleRate, smoothingTimeSecs);
	delaySmoothed.setCurrentAndTargetValue(*delay);

	rotationSmoothed.reset(sampleRate, smoothingTimeSecs);
	rotationSmoothed.setCurrentAndTargetValue(*rotation);

	dryWetSmoothed.reset(sampleRate, smoothingTimeSecs);
	dryWetSmoothed.setCurrentAndTargetValue(*bypass ? 0.0f : 1.0f);

	updateDelayBufferSize(sampleRate);
	writePosition = 0;
}

void LPannerAudioProcessor::releaseResources() {
	delayBufferF.setSize(0, 0);
	delayBufferD.setSize(0, 0);
}

void LPannerAudioProcessor::updateDelayBufferSize(double sampleRate) {
	const int delayBufferSize = static_cast<int>(sampleRate * DELAY_SECS);
	delayBufferF.setSize(1, delayBufferSize);
	delayBufferD.setSize(1, delayBufferSize);
	delayBufferF.clear();
	delayBufferD.clear();
}

#ifndef JucePlugin_PreferredChannelConfigurations
bool LPannerAudioProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const
{
#if JucePlugin_IsMidiEffect
	juce::ignoreUnused(layouts);
	return true;
#else
	// This is the place where you check if the layout is supported.
	// In this template code we only support mono or stereo.
	// Some plugin hosts, such as certain GarageBand versions, will only
	// load plugins that support stereo bus layouts.
	if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::mono()
		&& layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
		return false;

	// This checks if the input layout matches the output layout
#if ! JucePlugin_IsSynth
	if (layouts.getMainOutputChannelSet() != layouts.getMainInputChannelSet())
		return false;
#endif

	return true;
#endif
}
#endif

//==============================================================================
void LPannerAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) {
	processBlockImpl(buffer, midiMessages);
}

void LPannerAudioProcessor::processBlock(juce::AudioBuffer<double>& buffer, juce::MidiBuffer& midiMessages) {
	processBlockImpl(buffer, midiMessages);
}

template <typename T>
void LPannerAudioProcessor::processBlockImpl(juce::AudioBuffer<T>& buffer, juce::MidiBuffer& midiMessages) {
	juce::ignoreUnused(midiMessages);
	juce::ScopedNoDenormals noDenormals;

	const auto totalNumInputChannels = getTotalNumInputChannels();
	const auto totalNumOutputChannels = getTotalNumOutputChannels();
	const auto bufferSize = buffer.getNumSamples();

	// Clear unused outputs
	for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
		buffer.clear(i, 0, buffer.getNumSamples());

	auto& delayBuffer = getDelayBuffer<T>();
	const auto delayBufferSize = delayBuffer.getNumSamples();

	auto* leftPtr = buffer.getWritePointer(0);
	auto* rightPtr = buffer.getWritePointer(1);

	setTargetValue();

	ProcessingState state;

	for (int sampleIdx = 0; sampleIdx < bufferSize; sampleIdx++) {
		updateParameterValues(state);

		// Skip for-loop if completely dry
		if (state.wetMix <= 0.0f) {
			incrementWritePosition(delayBufferSize);
			continue;
		}

		// Calculate read position for delay
		const int readPosition = calculateReadPosition(state.delaySamples, delayBufferSize);

		// Store current input values
		const T leftInput = leftPtr[sampleIdx];
		const T rightInput = rightPtr[sampleIdx];

		// Calculate mid signal and store in delayBuffer
		const T midInput = (leftInput + rightInput) * static_cast<T>(0.5);
		delayBuffer.setSample(0, writePosition, midInput);

		// Get delayed mid signal from delayBuffer
		auto midDelaySignal = delayBuffer.getSample(0, readPosition);

		// Calcurate outputs
		auto leftClassic = state.leftClassicCoefficient1 * leftInput + state.leftClassicCoefficient2 * rightInput;
		auto rightClassic = state.rightClassicCoefficient1 * leftInput + state.rightClassicCoefficient2 * rightInput;
		auto leftModern = leftInput * state.cosTheta - rightInput * state.sinTheta + state.leftModernCoefficient * midDelaySignal;
		auto rightModern = leftInput * state.sinTheta + rightInput * state.cosTheta + state.rightModernCoefficient * midDelaySignal;

		// Mixdown outputs
		auto leftOutput = (1 - state.wetMix) * leftInput + state.wetMix * ((1 - state.stereoMix) * leftClassic + state.stereoMix * leftModern);
		auto rightOutput = (1 - state.wetMix) * rightInput + state.wetMix * ((1 - state.stereoMix) * rightClassic + state.stereoMix * rightModern);

		// Write outputs to buffer
		leftPtr[sampleIdx] = leftOutput;
		rightPtr[sampleIdx] = rightOutput;

		// Increment write position
		incrementWritePosition(delayBufferSize);
	}
}

void LPannerAudioProcessor::setTargetValue() {
	stereoSmoothed.setTargetValue(*stereo);
	stereoModeSmoothed.setTargetValue((!static_cast<int>(*stereoMode) || *stereo < 100.0f) ? 0.0f : 1.0f);
	delaySmoothed.setTargetValue(*delay);
	rotationSmoothed.setTargetValue(*rotation);
	dryWetSmoothed.setTargetValue(*bypass ? 0.0f : 1.0f);
}

void LPannerAudioProcessor::updateParameterValues(ProcessingState& state) {
	// Get smoothed parameter values and calulate delay in samples and rotation coefficients
	state.stereoWidth = stereoSmoothed.getNextValue() * 0.01f;
	state.stereoMix = stereoModeSmoothed.getNextValue();
	state.delaySamples = static_cast<int>((delaySmoothed.getNextValue() * getSampleRate()) * 0.001f);
	state.cosTheta = std::cos(rotationSmoothed.getNextValue() / 180.0f * PI);
	state.sinTheta = std::sin(rotationSmoothed.getNextValue() / 180.0f * PI);
	state.wetMix = dryWetSmoothed.getNextValue();

	// Pre-calculate coefficients for classic algorithm
	state.f1 = (1.0f + state.stereoWidth) * 0.5f;
	state.f2 = (1.0f - state.stereoWidth) * 0.5f;

	state.leftClassicCoefficient1 = state.f1 * state.cosTheta - state.f2 * state.sinTheta;
	state.leftClassicCoefficient2 = state.f2 * state.cosTheta - state.f1 * state.sinTheta;
	state.rightClassicCoefficient1 = state.f1 * state.sinTheta + state.f2 * state.cosTheta;
	state.rightClassicCoefficient2 = state.f2 * state.sinTheta + state.f1 * state.cosTheta;

	// Pre-calculate coefficients for modern algorithm
	state.leftModernCoefficient = (state.stereoWidth - 1.0f) * (state.cosTheta + state.sinTheta) * 0.5f;
	state.rightModernCoefficient = (state.stereoWidth - 1.0f) * (state.sinTheta - state.cosTheta) * 0.5f;
}

int LPannerAudioProcessor::calculateReadPosition(int delaySamples, int bufferSize) const {
	int readPosition = writePosition - delaySamples;
	if (readPosition < 0) readPosition += bufferSize;
	return readPosition;
}

void LPannerAudioProcessor::incrementWritePosition(int bufferSize) {
	++writePosition;
	if (writePosition >= bufferSize) writePosition = 0;

}

//==============================================================================
bool LPannerAudioProcessor::hasEditor() const
{
	return true; // (change this to false if you choose to not supply an editor)
}

juce::AudioProcessorEditor* LPannerAudioProcessor::createEditor()
{
	return new LPannerAudioProcessorEditor(*this);
}

//==============================================================================
void LPannerAudioProcessor::getStateInformation(juce::MemoryBlock& destData)
{
	// You should use this method to store your parameters in the memory block.
	// You could do that either as raw data, or use the XML or ValueTree classes
	// as intermediaries to make it easy to save and load complex data.
	auto state = parameters.copyState();
	std::unique_ptr<juce::XmlElement> xml(state.createXml());
	copyXmlToBinary(*xml, destData);
}

void LPannerAudioProcessor::setStateInformation(const void* data, int sizeInBytes)
{
	// You should use this method to restore your parameters from this memory block,
	// whose contents will have been created by the getStateInformation() call.
	std::unique_ptr<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));
	if (xmlState.get() != nullptr && xmlState->hasTagName(parameters.state.getType()))
		parameters.replaceState(juce::ValueTree::fromXml(*xmlState));
}

//==============================================================================
// This creates new instances of the plugin..
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
	return new LPannerAudioProcessor();
}
