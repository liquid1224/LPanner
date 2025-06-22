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
     : AudioProcessor (BusesProperties()
                     #if ! JucePlugin_IsMidiEffect
                      #if ! JucePlugin_IsSynth
                       .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                      #endif
                       .withOutput ("Output", juce::AudioChannelSet::stereo(), true)
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

void LPannerAudioProcessor::setCurrentProgram (int index)
{
}

const juce::String LPannerAudioProcessor::getProgramName (int index)
{
    return {};
}

void LPannerAudioProcessor::changeProgramName (int index, const juce::String& newName)
{
}

//==============================================================================
void LPannerAudioProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    // Use this method as the place to do any pre-playback
    // initialisation that you need..
    double smoothingTime = 0.01;
    stereoSmoothed.reset(sampleRate, smoothingTime);
    stereoSmoothed.setCurrentAndTargetValue(*stereo);

	delaySmoothed.reset(sampleRate, smoothingTime);
    delaySmoothed.setCurrentAndTargetValue(*delay);

	rotationSmoothed.reset(sampleRate, smoothingTime);
	rotationSmoothed.setCurrentAndTargetValue(*rotation);

	dryWetSmoothed.reset(sampleRate, smoothingTime);
    dryWetSmoothed.setCurrentAndTargetValue(*bypass ? 0.0f : 1.0f);

	int delayBufferSize = static_cast<int>(sampleRate * 2.0);
    delayBufferD.setSize(1, delayBufferSize);
    delayBufferF.setSize(1, delayBufferSize);
    writePosition = 0;
}

void LPannerAudioProcessor::releaseResources()
{
    // When playback stops, you can use this as an opportunity to free up any
    // spare memory, etc.
}

#ifndef JucePlugin_PreferredChannelConfigurations
bool LPannerAudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
  #if JucePlugin_IsMidiEffect
    juce::ignoreUnused (layouts);
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

template <typename T>
inline void LPannerAudioProcessor::processBlockImpl(juce::AudioBuffer<T>& buffer, juce::MidiBuffer& midiMessages) {
	juce::ScopedNoDenormals noDenormals;
	auto totalNumInputChannels = getTotalNumInputChannels();
	auto totalNumOutputChannels = getTotalNumOutputChannels();

    BufferSelector<T> bufferSelector;
    auto& delayBuffer = bufferSelector.getDelayBuffer(*this);

    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
		buffer.clear(i, 0, buffer.getNumSamples());

	updateParameters();
    double PI = 3.14159265358979;

	auto* leftPtr = buffer.getWritePointer(0);
	auto* rightPtr = buffer.getWritePointer(1);
    auto bufferSize = buffer.getNumSamples();
	auto delayBufferSize = delayBuffer.getNumSamples();

    for (int sampleIdx = 0; sampleIdx < bufferSize; sampleIdx++) {
        // Get current parameter values
        auto S = stereoSmoothed.getNextValue() / 100;
        auto Smix = stereoModeSmoothed.getNextValue();
        auto NumDelaySample = static_cast<int>((delaySmoothed.getNextValue() * getSampleRate()) / 1000.0f);
        auto Theta = rotationSmoothed.getNextValue() * PI / 180.0;
        auto Mix = dryWetSmoothed.getNextValue();

        // Calculate classic algorithm values
        auto f1 = (1 + S) / 2;
        auto f2 = (1 - S) / 2;
        auto cosTheta = std::cos(Theta);
        auto sinTheta = std::sin(Theta);

        // Calculate mid/side signals
		auto midInput = (leftPtr[sampleIdx] + rightPtr[sampleIdx]);
        auto sideInput = (leftPtr[sampleIdx] - rightPtr[sampleIdx]);

        // Determine readPosition and read delayBuffer
		readPosition = writePosition - NumDelaySample;
		if (readPosition < 0) readPosition += delayBufferSize;
		auto midDelaySignal = delayBuffer.getSample(0, readPosition);

        // Copy mid signal to delayBuffer
        if (delayBufferSize < writePosition) writePosition = 0;
		delayBuffer.setSample(0, writePosition, midInput);
		writePosition++;

        // Calcurate outputs
		auto leftClassic = (f1 * cosTheta - f2 * sinTheta) * leftPtr[sampleIdx] + (f2 * cosTheta - f1 * sinTheta) * rightPtr[sampleIdx];
		auto rightClassic = (f1 * sinTheta + f2 * cosTheta) * leftPtr[sampleIdx] + (f2 * sinTheta + f1 * cosTheta) * rightPtr[sampleIdx];
		auto leftModern = leftPtr[sampleIdx] * cosTheta - rightPtr[sampleIdx] * sinTheta + ((S - 1) * (cosTheta + sinTheta) / 2) * midDelaySignal;
        auto rightModern = leftPtr[sampleIdx] * sinTheta + rightPtr[sampleIdx] * cosTheta + ((S - 1) * (sinTheta - cosTheta) / 2) * midDelaySignal;

		// Mixdown outputs
        auto leftOutput = (1 - Mix) * leftPtr[sampleIdx] + Mix * ((1 - Smix) * leftClassic + Smix * leftModern);
		auto rightOutput = (1 - Mix) * rightPtr[sampleIdx] + Mix * ((1 - Smix) * rightClassic + Smix * rightModern);

		// Write outputs to buffer
		leftPtr[sampleIdx] = leftOutput;
        rightPtr[sampleIdx] = rightOutput;
    }
}

//==============================================================================
bool LPannerAudioProcessor::hasEditor() const
{
    return true; // (change this to false if you choose to not supply an editor)
}

juce::AudioProcessorEditor* LPannerAudioProcessor::createEditor()
{
    return new LPannerAudioProcessorEditor (*this);
}

//==============================================================================
void LPannerAudioProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    // You should use this method to store your parameters in the memory block.
    // You could do that either as raw data, or use the XML or ValueTree classes
    // as intermediaries to make it easy to save and load complex data.
	auto state = parameters.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}

void LPannerAudioProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    // You should use this method to restore your parameters from this memory block,
    // whose contents will have been created by the getStateInformation() call.
    std::unique_ptr<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));
    if(xmlState.get() != nullptr && xmlState -> hasTagName(parameters.state.getType()))
		parameters.replaceState(juce::ValueTree::fromXml(*xmlState));
}

//==============================================================================
// This creates new instances of the plugin..
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new LPannerAudioProcessor();
}
