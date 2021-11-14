/*
  ==============================================================================

    This file contains the basic framework code for a JUCE plugin processor.

  ==============================================================================
*/

#include "PluginProcessor.h"
#include "PluginEditor.h"
#include "cmath"
#include "corecrt_math_defines.h"

//==============================================================================
StereoPanAudioProcessor::StereoPanAudioProcessor()
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
    UserParams[MasterBypass] = 0.0f;
    UserParams[Gain] = 0.7f;
    UserParams[Width] = 0.5f;
    UserParams[Rotation] = 0.5f;
    UserParams[LPFLink] = 0.0f;
    UserParams[LPFFreq] = 1.0f;
    UserParams[PanLaw] = 0.0f;
}

StereoPanAudioProcessor::~StereoPanAudioProcessor()
{
}

//==============================================================================
int StereoPanAudioProcessor::getNumParameters()
{
    return totalNumParam;
}

float StereoPanAudioProcessor::getParameter(int index)
{
    if (index >= 0 && index < totalNumParam)
        return UserParams[index];
    else return 0;
}

void StereoPanAudioProcessor::setParameter(int index, float value)
{
    if (index >= 0 && index < totalNumParam)
        UserParams[index] = value;
    else return;
}

const juce::String StereoPanAudioProcessor::getParameterName(int index)
{
    switch (index)
    {
    case MasterBypass:
        return "Master Bypass";
    case Gain:
        return "Gain";
    case Width:
        return "Width";
    case Rotation:
        return "Rotation";
    case LPFLink:
        return "LPF Link";
    case LPFFreq:
        return "LPF Frequency";
    case PanLaw:
        return "Pan Law";
    case SampleRate:
        return "SampleRate";
    default:
        return juce::String();
    }
}

const juce::String StereoPanAudioProcessor::getParameterText(int index)
{
    switch (index)
    {
    case MasterBypass:
        return UserParams[MasterBypass] == 1.0f ? "BYPASS" : "EFFECT";
    case Gain:
        return juce::String(juce::Decibels::gainToDecibels( pow(UserParams[Gain], 2)*2.0f ), 1)+"dB";
    case Width:
        return juce::String(int(UserParams[Width]*200.0f))+"%";
    case Rotation:
        return juce::String(int(UserParams[Rotation]*200.0f-100.0f))+"%";
    case LPFLink:
        return UserParams[LPFLink] == 1.0f ? "EFFECT" : "BYPASS";
    case LPFFreq:
        return juce::String(UserParams[LPFFreq] * 100.0f);
    case PanLaw:
        if (UserParams[PanLaw] <= 0.0f)
            return "0.0dB";
        else if (0.0f < UserParams[PanLaw] <= 0.5f)
            return"-3.0dB";
        else if (0.5f < UserParams[PanLaw] < 1.0f)
            return "-4.5dB";
        else if (UserParams[PanLaw] = 1.0f)
            return "-6.0dB";
        else
            return juce::String();
    case SampleRate:
        return juce::String(UserParams[SampleRate]) + "Hz";
    default:
        return juce::String();
    }
}

const juce::String StereoPanAudioProcessor::getName() const
{
    return JucePlugin_Name;
}

bool StereoPanAudioProcessor::acceptsMidi() const
{
   #if JucePlugin_WantsMidiInput
    return true;
   #else
    return false;
   #endif
}

bool StereoPanAudioProcessor::producesMidi() const
{
   #if JucePlugin_ProducesMidiOutput
    return true;
   #else
    return false;
   #endif
}

bool StereoPanAudioProcessor::isMidiEffect() const
{
   #if JucePlugin_IsMidiEffect
    return true;
   #else
    return false;
   #endif
}

double StereoPanAudioProcessor::getTailLengthSeconds() const
{
    return 0.0;
}

int StereoPanAudioProcessor::getNumPrograms()
{
    return 1;   // NB: some hosts don't cope very well if you tell them there are 0 programs,
                // so this should be at least 1, even if you're not really implementing programs.
}

int StereoPanAudioProcessor::getCurrentProgram()
{
    return 0;
}

void StereoPanAudioProcessor::setCurrentProgram (int index)
{
}

const juce::String StereoPanAudioProcessor::getProgramName (int index)
{
    return {};
}

void StereoPanAudioProcessor::changeProgramName (int index, const juce::String& newName)
{
}

//==============================================================================
void StereoPanAudioProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    // Use this method as the place to do any pre-playback
    // initialisation that you need..
}

void StereoPanAudioProcessor::releaseResources()
{
    // When playback stops, you can use this as an opportunity to free up any
    // spare memory, etc.
}

#ifndef JucePlugin_PreferredChannelConfigurations
bool StereoPanAudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
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

void StereoPanAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    juce::ScopedNoDenormals noDenormals;
    auto totalNumInputChannels  = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    // In case we have more outputs than inputs, this code clears any output
    // channels that didn't contain input data, (because these aren't
    // guaranteed to be empty - they may contain garbage).
    // This is here to avoid people getting screaming feedback
    // when they first compile a plugin, but obviously you don't need to keep
    // this code if your algorithm always overwrites all the output channels.
   // for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
   //     buffer.clear (i, 0, buffer.getNumSamples());

    // This is the place where you'd normally do the guts of your plugin's
    // audio processing...
    // Make sure to reset the state if your inner loop is processing
    // the samples and the outer loop is handling the channels.
    // Alternatively, you can process the samples with the channels
    // interleaved by keeping the same state.
    for (int channel = 0; channel < totalNumInputChannels; ++channel)
    {
        //auto* channelData = buffer.getWritePointer (channel);

        auto* leftChannel = buffer.getWritePointer(0);
        auto* rightChannel = buffer.getWritePointer(1);

        if (UserParams[MasterBypass] == 1.0f)
            return;

        float Theta_w = M_PI/2 * UserParams[Width] - M_PI / 4;
        float Theta_r = -(M_PI/2 * UserParams[Rotation] - M_PI / 4);

        for (int i = 0; i < buffer.getNumSamples(); ++i)
        {
            auto midInput = (leftChannel[i] + rightChannel[i]);
            auto sideInput = (leftChannel[i] - rightChannel[i]);

            auto midWidth = midInput * sin(M_PI/4 - Theta_w) * sqrt(2);
            auto sideWidth = sideInput * cos(M_PI/4 - Theta_w) * sqrt(2);

            auto midRotation = midWidth * cos(Theta_r) - sideWidth * sin(Theta_r);
            auto sideRotation = midWidth * sin(Theta_r) + sideWidth * cos(Theta_r);

            leftChannel[i] = (midRotation + sideRotation);
            rightChannel[i] = (midRotation - sideRotation);
        }

        //juce::dsp::AudioBlock<float> stereoblock(buffer);

        float _samplerate = getSampleRate();
        UserParams[SampleRate] = _samplerate;

        float frequencyLink = 1.0f * pow(20000.0f, UserParams[LPFFreq]);
        float LPFBias = 2 * abs(0.5f - UserParams[Rotation]);
        float _frequency = LPFBias*frequencyLink + (1-LPFBias)*20000.0f;
        //float _frequency = frequencyLink;
        //float _Q = 0.7f;

        auto* cutChannel = rightChannel;
        int cutChannelID = 1;
        if (Theta_r > 0.0f)
        {
            cutChannel = rightChannel;
            cutChannelID = 1;
        }
            
        else if (Theta_r < 0.0f)
        {
            cutChannel = leftChannel;
            cutChannelID = 0;
        }

        if (Theta_r != 0)
        {
            LPF[channel].setCoefficients(juce::IIRCoefficients::makeLowPass(_samplerate, _frequency));
            LPF[channel].processSamples(cutChannel, buffer.getNumSamples());
        }
        
        /*
        if (Theta_r > 0 )
        {
            iirfilter[channel].SetParameter(_samplerate, _frequency, _Q);
            iirfilter[channel].DoProcess(rightChannel, buffer.getNumSamples());
        }
        else if (Theta_r < 0)
        {
            iirfilter[channel].SetParameter(_samplerate, _frequency, _Q);
            iirfilter[channel].DoProcess(leftChannel, buffer.getNumSamples());
        }
        */
        
        buffer.applyGain( pow(UserParams[Gain], 2) );
    }
}

//==============================================================================
bool StereoPanAudioProcessor::hasEditor() const
{
    return false; // (change this to false if you choose to not supply an editor)
}

juce::AudioProcessorEditor* StereoPanAudioProcessor::createEditor()
{
    return new StereoPanAudioProcessorEditor (*this);
}

//==============================================================================
void StereoPanAudioProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    // You should use this method to store your parameters in the memory block.
    // You could do that either as raw data, or use the XML or ValueTree classes
    // as intermediaries to make it easy to save and load complex data.
    juce::XmlElement root("Root");
    juce::XmlElement* el;

    el = root.createNewChildElement("MasterBypass");
    el->addTextElement(juce::String(UserParams[MasterBypass]));

    el = root.createNewChildElement("Gain");
    el->addTextElement(juce::String(UserParams[Gain]));
    
    el = root.createNewChildElement("Width");
    el->addTextElement(juce::String(UserParams[Width]));
    
    el = root.createNewChildElement("Rotation");
    el->addTextElement(juce::String(UserParams[Rotation]));

    el = root.createNewChildElement("LPFLink");
    el->addTextElement(juce::String(UserParams[LPFLink]));

    el = root.createNewChildElement("LPFFreq");
    el->addTextElement(juce::String(UserParams[LPFFreq]));

    el = root.createNewChildElement("PanLaw");
    el->addTextElement(juce::String(UserParams[PanLaw]));

    //el = root.createNewChildElement("SampleRate");
    //el->addTextElement(juce::String(UserParams[SampleRate]));

    copyXmlToBinary(root, destData);
}

void StereoPanAudioProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    // You should use this method to restore your parameters from this memory block,
    // whose contents will have been created by the getStateInformation() call.
    
    //juce::XmlElement* pRoot = getXmlFromBinary(data, sizeInBytes);

    //juce::ScopedPointer<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));

    std::unique_ptr<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));

    if (xmlState.get() != nullptr)
    {
        forEachXmlChildElement(*xmlState, pChild)
        {
            if (pChild->hasTagName("MasterBypass"))
            {
                juce::String text = pChild->getAllSubText();
                setParameter(MasterBypass, text.getFloatValue());
            }
            else if (pChild->hasTagName("Gain"))
            {
                juce::String text = pChild->getAllSubText();
                setParameter(Gain, text.getFloatValue());
            }
            else if (pChild->hasTagName("Width"))
            {
                juce::String text = pChild->getAllSubText();
                setParameter(Width, text.getFloatValue());
            }
            else if (pChild->hasTagName("Rotation"))
            {
                juce::String text = pChild->getAllSubText();
                setParameter(Rotation, text.getFloatValue());
            }
            else if (pChild->hasTagName("LPFLink"))
            {
                juce::String text = pChild->getAllSubText();
                setParameter(LPFLink, text.getFloatValue());
            }
            else if (pChild->hasTagName("LPFFreq"))
            {
                juce::String text = pChild->getAllSubText();
                setParameter(LPFFreq, text.getFloatValue());
            }
            else if (pChild->hasTagName("PanLaw"))
            {
                juce::String text = pChild->getAllSubText();
                setParameter(PanLaw, text.getFloatValue());
            }
        }
    }
}

//==============================================================================
// This creates new instances of the plugin..
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new StereoPanAudioProcessor();
}
