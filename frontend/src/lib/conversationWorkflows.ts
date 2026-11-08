/**
 * Agronomy AI — Multi-turn Conversation Workflows
 * State-machine based multi-step voice workflows for Disease Scanning & Crop Recommendation.
 */

import { WorkflowStep, WorkflowState, WorkflowType } from './voiceOS'

// ── Crop Recommendation Workflow Steps ───────────────────────────────────────

export const CROP_STEPS: WorkflowStep[] = [
  {
    id: 'nitrogen',
    field: 'nitrogen',
    type: 'number',
    min: 0,
    max: 250,
    question: 'Please tell me your soil nutrient values. What is the Nitrogen content in your soil? (0 to 250 kg per hectare)',
    question_te: 'దయచేసి మీ నేల పోషకాల వివరాలు చెప్పండి. మీ నేలలో నత్రజని పరిమాణం ఎంత? (0 నుండి 250 కిలోల మధ్య)',
    question_hi: 'कृपया अपनी मिट्टी के पोषक तत्वों की जानकारी दें। आपकी मिट्टी में नाइट्रोजन की मात्रा कितनी है? (0 से 250 किलोग्राम)',
    validation: (val) => {
      const n = Number(val)
      if (isNaN(n) || n < 0 || n > 250) return 'Please say a number between 0 and 250.'
      return null
    },
  },
  {
    id: 'phosphorus',
    field: 'phosphorus',
    type: 'number',
    min: 0,
    max: 200,
    question: 'What is the phosphorus value? (0 to 200 kg per hectare)',
    question_te: 'భాస్వరం పరిమాణం ఎంత? (0 నుండి 200 కిలోల మధ్య)',
    question_hi: 'फास्फोरस का मान क्या है? (0 से 200 किलोग्राम)',
    validation: (val) => {
      const n = Number(val)
      if (isNaN(n) || n < 0 || n > 200) return 'Please say a number between 0 and 200.'
      return null
    },
  },
  {
    id: 'potassium',
    field: 'potassium',
    type: 'number',
    min: 0,
    max: 250,
    question: 'What is the potassium value? (0 to 250 kg per hectare)',
    question_te: 'పొటాషియం పరిమాణం ఎంత? (0 నుండి 250 కిలోల మధ్య)',
    question_hi: 'पोटेशियम का मान क्या है? (0 से 250 किलोग्राम)',
    validation: (val) => {
      const n = Number(val)
      if (isNaN(n) || n < 0 || n > 250) return 'Please say a number between 0 and 250.'
      return null
    },
  },
  {
    id: 'temperature',
    field: 'temperature',
    type: 'number',
    min: -10,
    max: 55,
    question: 'What is the average temperature in degrees Celsius?',
    question_te: 'మీ ప్రాంతంలో సగటు ఉష్ణోగ్రత ఎంత డిగ్రీ సెల్సియస్?',
    question_hi: 'औसत तापमान कितने डिग्री सेल्सियस है?',
    validation: (val) => {
      const n = Number(val)
      if (isNaN(n) || n < -10 || n > 55) return 'Temperature must be between -10 and 55 degrees.'
      return null
    },
  },
  {
    id: 'humidity',
    field: 'humidity',
    type: 'number',
    min: 0,
    max: 100,
    question: 'What is the average humidity percentage?',
    question_te: 'సగటు తేమ శాతం ఎంత?',
    question_hi: 'औसत आर्द्रता प्रतिशत कितना है?',
    validation: (val) => {
      const n = Number(val)
      if (isNaN(n) || n < 0 || n > 100) return 'Humidity must be between 0 and 100 percent.'
      return null
    },
  },
  {
    id: 'ph',
    field: 'ph',
    type: 'number',
    min: 3.0,
    max: 10.0,
    question: 'What is the soil pH? (typically 3 to 10)',
    question_te: 'నేల pH స్థాయి ఎంత? (సాధారణంగా 3 నుండి 10)',
    question_hi: 'मिट्टी का pH मान क्या है? (3 से 10 के बीच)',
    validation: (val) => {
      const n = Number(val)
      if (isNaN(n) || n < 3 || n > 10) return 'pH must be between 3 and 10.'
      return null
    },
  },
  {
    id: 'rainfall',
    field: 'rainfall',
    type: 'number',
    min: 0,
    max: 400,
    question: 'What is the monthly rainfall in millimeters?',
    question_te: 'నెలవారీ వర్షపాతం ఎంత మిల్లీమీటర్లు?',
    question_hi: 'मासिक वर्षा कितने मिलीमीटर है?',
    validation: (val) => {
      const n = Number(val)
      if (isNaN(n) || n < 0 || n > 400) return 'Rainfall must be between 0 and 400 mm.'
      return null
    },
  },
  {
    id: 'confirm',
    field: '__confirm__',
    type: 'confirm',
    question: 'I have all soil values. Shall I submit and recommend the best crops now?',
    question_te: 'అన్ని నేల వివరాలు అందాయి. ఉత్తమ పంటల సిఫార్సు తయారు చేయమంటారా?',
    question_hi: 'सभी मिट्टी के मान मिल गए। क्या मैं अब सर्वोत्तम फसलों की सिफारिश करूँ?',
  },
]

// ── Disease Scanner Workflow Steps ───────────────────────────────────────────

export const DISEASE_SCAN_STEPS: WorkflowStep[] = [
  {
    id: 'image_source',
    field: '__image_source__',
    type: 'choice',
    choices: ['take photo', 'upload from gallery', 'take a photo', 'camera', 'gallery'],
    question: 'Would you like to take a photo or upload an image from your gallery?',
    question_te: 'మీరు ఫోటో తీయాలనుకుంటున్నారా లేదా మీ గ్యాలరీ నుండి చిత్రాన్ని అప్‌లోడ్ చేయాలనుకుంటున్నారా?',
    question_hi: 'क्या आप फोटो लेना चाहते हैं या गैलरी से छवि अपलोड करना चाहते हैं?',
  },
  {
    id: 'camera_facing',
    field: '__camera_facing__',
    type: 'choice',
    choices: ['back camera', 'front camera', 'back', 'front', 'rear camera'],
    question: 'Would you like to use the front camera or back camera?',
    question_te: 'మీరు ముందు కెమెరా లేదా వెనుక కెమెరా ఉపయోగించాలనుకుంటున్నారా?',
    question_hi: 'क्या आप फ्रंट कैमरा या बैक कैमरा का उपयोग करना चाहते हैं?',
  },
  {
    id: 'wait_capture',
    field: '__wait_capture__',
    type: 'action',
    question: 'Camera preview is ready. Say capture to photograph your plant leaf.',
    question_te: 'కెమెరా సిద్ధంగా ఉంది. ఫోటో తీయడానికి క్యాప్చర్ అని చెప్పండి.',
    question_hi: 'कैमरा तैयार है। फोटो खींचने के लिए कैप्चर कहें।',
  },
  {
    id: 'confirm_analyze',
    field: '__confirm_analyze__',
    type: 'confirm',
    question: 'Your plant photo is ready. Should I analyze it?',
    question_te: 'మీ మొక్క ఫోటో సిద్ధంగా ఉంది. విశ్లేషించమంటారా?',
    question_hi: 'आपकी पौधे की फोटो तैयार है। क्या मैं इसका विश्लेषण करूँ?',
  },
]

// ── Number & Quantity Extractor ───────────────────────────────────────────────

export function extractNumber(text: string): string | null {
  const wordNumbers: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    hundred: 100,
  }

  // Look for digits like 80, 6.5, 120
  const digitMatch = text.match(/[\d]+(?:\.\d+)?/)
  if (digitMatch) return digitMatch[0]

  // Look for spoken word numbers
  const lower = text.toLowerCase()
  for (const [word, val] of Object.entries(wordNumbers)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(lower)) {
      return String(val)
    }
  }

  return null
}

export function createWorkflow(type: WorkflowType, initialData: Record<string, any> = {}): WorkflowState | null {
  if (type === 'crop_recommendation') {
    // Find first step that is not yet filled
    let startIdx = 0
    const fields = ['nitrogen', 'phosphorus', 'potassium', 'temperature', 'humidity', 'ph', 'rainfall']
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i]
      if (initialData[f] === undefined || initialData[f] === '' || initialData[f] === null) {
        startIdx = i
        break
      }
      if (i === fields.length - 1) {
        startIdx = 7 // All filled -> confirmation step!
      }
    }

    return {
      type,
      currentStep: startIdx,
      currentStepIndex: startIdx,
      status: 'in_progress',
      steps: CROP_STEPS.map((s) => ({
        ...s,
        prompt: {
          en: s.question,
          te: s.question_te || s.question,
          hi: s.question_hi || s.question,
        },
      })),
      collectedData: { ...initialData },
      isComplete: false,
      isPending: false,
    }
  }

  if (type === 'disease_scan') {
    return {
      type,
      currentStep: 0,
      currentStepIndex: 0,
      status: 'in_progress',
      steps: DISEASE_SCAN_STEPS.map((s) => ({
        ...s,
        prompt: {
          en: s.question,
          te: s.question_te || s.question,
          hi: s.question_hi || s.question,
        },
      })),
      collectedData: {},
      isComplete: false,
      isPending: false,
    }
  }

  return null
}

export function getWorkflowPrompt(workflow: WorkflowState, language: 'en' | 'te' | 'hi' = 'en'): string {
  const stepIdx = workflow.currentStepIndex ?? workflow.currentStep ?? 0
  const step = workflow.steps[stepIdx]
  if (!step) return ''
  if (language === 'te' && step.question_te) return step.question_te
  if (language === 'hi' && step.question_hi) return step.question_hi
  return step.question
}

export function advanceWorkflowWithInput(
  workflow: WorkflowState,
  input: string,
  language: 'en' | 'te' | 'hi' = 'en'
): {
  handled: boolean
  updatedWorkflow: WorkflowState
  nextPrompt?: string
  isCompleted?: boolean
  actionToExecute?: { actionId: string; params?: any }
} {
  const stepIdx = workflow.currentStepIndex ?? workflow.currentStep ?? 0
  const step = workflow.steps[stepIdx]
  if (!step) {
    return { handled: false, updatedWorkflow: workflow }
  }

  const cleanInput = input.trim().toLowerCase()

  // ─────────────────────────────────────────────────────────────
  // A. DISEASE SCANNING MULTI-TURN WORKFLOW
  // ─────────────────────────────────────────────────────────────
  if (workflow.type === 'disease_scan') {
    // Step 0: Choose Image Source ("take photo" vs "upload from gallery")
    if (step.id === 'image_source') {
      if (
        cleanInput.includes('take a photo') ||
        cleanInput.includes('take photo') ||
        cleanInput.includes('photo') ||
        cleanInput.includes('camera') ||
        cleanInput.includes('ఫోటో') ||
        cleanInput.includes('కెమెరా') ||
        cleanInput.includes('फोटो') ||
        cleanInput.includes('कैमरा')
      ) {
        // Move to camera selection
        const nextStepIdx = 1
        const nextPrompt =
          language === 'te'
            ? 'మీరు ముందు కెమెరా లేదా వెనుక కెమెరా ఉపయోగించాలనుకుంటున్నారా?'
            : language === 'hi'
            ? 'क्या आप फ्रंट कैमरा या बैक कैमरा का उपयोग करना चाहते हैं?'
            : 'Would you like to use the front camera or back camera?'

        return {
          handled: true,
          updatedWorkflow: {
            ...workflow,
            currentStep: nextStepIdx,
            currentStepIndex: nextStepIdx,
            collectedData: { ...workflow.collectedData, source: 'camera' },
          },
          nextPrompt,
        }
      }

      if (
        cleanInput.includes('gallery') ||
        cleanInput.includes('upload') ||
        cleanInput.includes('గ్యాలరీ') ||
        cleanInput.includes('गैलरी')
      ) {
        const nextPrompt =
          language === 'te'
            ? 'దయచేసి మీ గ్యాలరీ నుండి చిత్రాన్ని ఎంచుకోండి.'
            : language === 'hi'
            ? 'कृपया अपनी गैलरी से छवि चुनें।'
            : 'Please select an image from your gallery.'

        return {
          handled: true,
          updatedWorkflow: {
            ...workflow,
            status: 'completed',
            isComplete: true,
          },
          nextPrompt,
          isCompleted: true,
          actionToExecute: {
            actionId: 'open_gallery',
          },
        }
      }

      // Unrecognized choice -> repeat question
      return {
        handled: true,
        updatedWorkflow: workflow,
        nextPrompt:
          language === 'te'
            ? 'దయచేసి ఫోటో తీయండి లేదా గ్యాలరీ అని చెప్పండి.'
            : language === 'hi'
            ? 'कृपया फोटो खींचना या गैलरी से अपलोड करना चुनें।'
            : 'Would you like to take a photo or upload an image from your gallery?',
      }
    }

    // Step 1: Camera Facing Choice ("front camera" vs "back camera")
    if (step.id === 'camera_facing') {
      const isBack =
        cleanInput.includes('back') ||
        cleanInput.includes('rear') ||
        cleanInput.includes('వెనుక') ||
        cleanInput.includes('బ్యాక్') ||
        cleanInput.includes('बैक') ||
        cleanInput.includes('पिछला')

      const isFront =
        cleanInput.includes('front') ||
        cleanInput.includes('selfie') ||
        cleanInput.includes('ముందు') ||
        cleanInput.includes('ఫ్రంట్') ||
        cleanInput.includes('फ्रंट') ||
        cleanInput.includes('सामने')

      if (isBack || isFront) {
        const facing = isBack ? 'environment' : 'user'
        const nextStepIdx = 2 // Move to wait_capture
        const nextPrompt =
          isBack
            ? (language === 'te'
                ? 'వెనుక కెమెరా తెరవబడింది. ఫోటో తీయడానికి క్యాప్చర్ అని చెప్పండి.'
                : language === 'hi'
                ? 'बैक कैमरा सक्रिय है। फोटो खींचने के लिए कैप्चर कहें।'
                : 'Opening rear camera. Say capture to take the photo.')
            : (language === 'te'
                ? 'ముందు కెమెరా తెరవబడింది. ఫోటో తీయడానికి క్యాప్చర్ అని చెప్పండి.'
                : language === 'hi'
                ? 'फ्रंट कैमरा सक्रिय है। फोटो खींचने के लिए कैप्चर कहें।'
                : 'Opening front camera. Say capture to take the photo.')

        return {
          handled: true,
          updatedWorkflow: {
            ...workflow,
            currentStep: nextStepIdx,
            currentStepIndex: nextStepIdx,
            collectedData: { ...workflow.collectedData, cameraFacing: facing },
          },
          nextPrompt,
          actionToExecute: {
            actionId: isBack ? 'open_back_camera' : 'open_front_camera',
            params: { camera: facing },
          },
        }
      }

      return {
        handled: true,
        updatedWorkflow: workflow,
        nextPrompt:
          language === 'te'
            ? 'మీరు ముందు కెమెరా లేదా వెనుక కెమెరా ఉపయోగించాలనుకుంటున్నారా?'
            : language === 'hi'
            ? 'क्या आप फ्रंट कैमरा या बैक कैमरा का उपयोग करना चाहते हैं?'
            : 'Would you like to use the front camera or back camera?',
      }
    }

    // Step 2: Wait Capture ("capture" / "click" / "take photo")
    if (step.id === 'wait_capture') {
      if (
        cleanInput.includes('capture') ||
        cleanInput.includes('snap') ||
        cleanInput.includes('click') ||
        cleanInput.includes('take photo') ||
        cleanInput.includes('క్యాప్చర్') ||
        cleanInput.includes('ఫోటో') ||
        cleanInput.includes('कैप्चर') ||
        cleanInput.includes('फोटो')
      ) {
        const nextStepIdx = 3 // Move to confirm_analyze
        const nextPrompt =
          language === 'te'
            ? 'మీ మొక్క ఫోటో సిద్ధంగా ఉంది. విశ్లేషించమంటారా?'
            : language === 'hi'
            ? 'आपकी पौधे की फोटो तैयार है। क्या मैं इसका विश्लेषण करूँ?'
            : 'Your plant photo is ready. Should I analyze it?'

        return {
          handled: true,
          updatedWorkflow: {
            ...workflow,
            currentStep: nextStepIdx,
            currentStepIndex: nextStepIdx,
            collectedData: { ...workflow.collectedData, captured: true },
          },
          nextPrompt,
          actionToExecute: {
            actionId: 'capture_plant_photo',
          },
        }
      }

      if (cleanInput.includes('retake') || cleanInput.includes('మళ్ళీ') || cleanInput.includes('फिर से')) {
        return {
          handled: true,
          updatedWorkflow: workflow,
          nextPrompt:
            language === 'te'
              ? 'కెమెరా సిద్ధంగా ఉంది. ఫోటో తీయడానికి క్యాప్చర్ అని చెప్పండి.'
              : language === 'hi'
              ? 'कैमरा तैयार है। फोटो खींचने के लिए कैप्चर कहें।'
              : 'Camera ready. Say capture to take the photo.',
          actionToExecute: {
            actionId: 'retake_photo',
          },
        }
      }

      return {
        handled: true,
        updatedWorkflow: workflow,
        nextPrompt:
          language === 'te'
            ? 'ఫోటో తీయడానికి క్యాప్చర్ అని చెప్పండి.'
            : language === 'hi'
            ? 'फोटो खींचने के लिए कैप्चर कहें।'
            : 'Say capture to take the photo.',
      }
    }

    // Step 3: Confirm Analyze ("yes" -> analyze, "retake" -> retake, "no/upload" -> gallery)
    if (step.id === 'confirm_analyze') {
      if (
        cleanInput.includes('yes') ||
        cleanInput.includes('analyze') ||
        cleanInput.includes('proceed') ||
        cleanInput.includes('confirm') ||
        cleanInput.includes('do it') ||
        cleanInput.includes('okay') ||
        cleanInput.includes('అవును') ||
        cleanInput.includes('సరే') ||
        cleanInput.includes('విశ్లేషించు') ||
        cleanInput.includes('हाँ') ||
        cleanInput.includes('विश्लेषण')
      ) {
        const finishPrompt =
          language === 'te'
            ? 'మొక్క తెగులును విశ్లేషిస్తున్నాను.'
            : language === 'hi'
            ? 'पौधे की बीमारी का विश्लेषण कर रहे हैं।'
            : 'Analyzing plant leaf image for diseases.'

        return {
          handled: true,
          updatedWorkflow: {
            ...workflow,
            status: 'completed',
            isComplete: true,
          },
          nextPrompt: finishPrompt,
          isCompleted: true,
          actionToExecute: {
            actionId: 'submit_scan',
          },
        }
      }

      if (cleanInput.includes('retake') || cleanInput.includes('మళ్ళీ') || cleanInput.includes('फिर से')) {
        const prevStepIdx = 2
        return {
          handled: true,
          updatedWorkflow: {
            ...workflow,
            currentStep: prevStepIdx,
            currentStepIndex: prevStepIdx,
          },
          nextPrompt:
            language === 'te'
              ? 'కెమెరా ప్రివ్యూకి తిరిగి వెళ్తున్నాను. ఫోటో తీయడానికి క్యాప్చర్ అని చెప్పండి.'
              : language === 'hi'
              ? 'कैमरा पूर्वावलोकन पर वापस जा रहे हैं। फोटो खींचने के लिए कैप्चर कहें।'
              : 'Returning to camera preview. Say capture to take the photo.',
          actionToExecute: {
            actionId: 'retake_photo',
          },
        }
      }

      if (cleanInput.includes('gallery') || cleanInput.includes('upload') || cleanInput.includes('గ్యాలరీ') || cleanInput.includes('गैलरी')) {
        return {
          handled: true,
          updatedWorkflow: {
            ...workflow,
            status: 'completed',
            isComplete: true,
          },
          nextPrompt:
            language === 'te'
              ? 'దయచేసి మీ గ్యాలరీ నుండి చిత్రాన్ని ఎంచుకోండి.'
              : language === 'hi'
              ? 'कृपया अपनी गैलरी से छवि चुनें।'
              : 'Please select an image from your gallery.',
          isCompleted: true,
          actionToExecute: {
            actionId: 'open_gallery',
          },
        }
      }

      return {
        handled: true,
        updatedWorkflow: workflow,
        nextPrompt:
          language === 'te'
            ? 'విశ్లేషించాలా? అవును లేదా మళ్ళీ తీయి అని చెప్పండి.'
            : language === 'hi'
            ? 'क्या विश्लेषण करें? हाँ या फिर से खींचो कहें।'
            : 'Your plant photo is ready. Should I analyze it? Say yes or retake.',
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // B. CROP RECOMMENDATION MULTI-TURN WORKFLOW
  // ─────────────────────────────────────────────────────────────
  if (workflow.type === 'crop_recommendation') {
    // If confirmation step
    if (step.id === 'confirm') {
      if (
        cleanInput.includes('yes') ||
        cleanInput.includes('submit') ||
        cleanInput.includes('proceed') ||
        cleanInput.includes('confirm') ||
        cleanInput.includes('okay') ||
        cleanInput.includes('do it') ||
        cleanInput.includes('అవును') ||
        cleanInput.includes('సరే') ||
        cleanInput.includes('हाँ') ||
        cleanInput.includes('सिफारिश')
      ) {
        const finishPrompt =
          language === 'te'
            ? 'మీ నేల పరిస్థితులకు ఉత్తమ పంటను సిఫార్సు చేస్తున్నాను.'
            : language === 'hi'
            ? 'आपकी मिट्टी की स्थिति के लिए सर्वोत्तम फसल की सिफारिश कर रहे हैं।'
            : 'Calculating optimal crop recommendation for your soil.'

        return {
          handled: true,
          updatedWorkflow: {
            ...workflow,
            status: 'completed',
            isComplete: true,
          },
          nextPrompt: finishPrompt,
          isCompleted: true,
          actionToExecute: {
            actionId: 'submit_crop_form',
            params: workflow.collectedData,
          },
        }
      }

      if (cleanInput.includes('no') || cleanInput.includes('cancel') || cleanInput.includes('వద్దు') || cleanInput.includes('नहीं')) {
        return {
          handled: true,
          updatedWorkflow: {
            ...workflow,
            status: 'cancelled',
            isComplete: true,
          },
          nextPrompt:
            language === 'te' ? 'పంట సిఫార్సు రద్దు చేయబడింది.' : language === 'hi' ? 'फसल सिफारिश रद्द कर दी गई।' : 'Crop recommendation cancelled.',
        }
      }
    }

    // Number collection step
    const num = extractNumber(input)
    if (!num) {
      return {
        handled: true,
        updatedWorkflow: workflow,
        nextPrompt:
          language === 'te'
            ? `దయచేసి ఒక సంఖ్యను చెప్పండి. ${step.question_te || step.question}`
            : language === 'hi'
            ? `कृपया एक संख्या बताएं। ${step.question_hi || step.question}`
            : `Please provide a numeric value. ${step.question}`,
      }
    }

    if (step.validation) {
      const err = step.validation(num)
      if (err) {
        return {
          handled: true,
          updatedWorkflow: workflow,
          nextPrompt: err,
        }
      }
    }

    const newData = { ...workflow.collectedData, [step.field]: num }
    const nextStepIdx = stepIdx + 1
    const nextStep = workflow.steps[nextStepIdx]

    if (!nextStep || nextStep.id === 'confirm') {
      // Build confirmation prompt with all collected values
      const n = newData.nitrogen || 80
      const p = newData.phosphorus || 40
      const k = newData.potassium || 35
      const t = newData.temperature || 28
      const h = newData.humidity || 70
      const ph = newData.ph || 6.5
      const r = newData.rainfall || 120

      const confirmPrompt =
        language === 'te'
          ? `అన్ని నేల వివరాలు నమోదయ్యాయి: నత్రజని ${n}, భాస్వరం ${p}, పొటాషియం ${k}, ఉష్ణోగ్రత ${t}, తేమ ${h}, pH ${ph}, మరియు వర్షపాతం ${r}. ఉత్తమ పంటలను సిఫార్సు చేయమంటారా?`
          : language === 'hi'
          ? `सभी मिट्टी के मान दर्ज हैं: नाइट्रोजन ${n}, फास्फोरस ${p}, पोटेशियम ${k}, तापमान ${t}, नमी ${h}, pH ${ph}, और वर्षा ${r}। क्या मैं फसलों की सिफारिश करूँ?`
          : `All 7 parameters recorded: Nitrogen ${n}, Phosphorus ${p}, Potassium ${k}, Temperature ${t}, Humidity ${h}, pH ${ph}, and Rainfall ${r}. Shall I recommend the best crops now?`

      return {
        handled: true,
        updatedWorkflow: {
          ...workflow,
          currentStep: nextStepIdx,
          currentStepIndex: nextStepIdx,
          collectedData: newData,
        },
        nextPrompt: confirmPrompt,
        actionToExecute: {
          actionId: 'fill_crop_field',
          params: { field: step.field, value: num },
        },
      }
    }

    const nextQ =
      (language === 'te' ? nextStep.question_te : language === 'hi' ? nextStep.question_hi : nextStep.question) ||
      nextStep.question

    return {
      handled: true,
      updatedWorkflow: {
        ...workflow,
        currentStep: nextStepIdx,
        currentStepIndex: nextStepIdx,
        collectedData: newData,
      },
      nextPrompt: nextQ,
      actionToExecute: {
        actionId: 'fill_crop_field',
        params: { field: step.field, value: num },
      },
    }
  }

  return { handled: false, updatedWorkflow: workflow }
}
