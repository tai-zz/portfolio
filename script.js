// Espaco para futuras interacoes.
console.log("Portfolio carregado");

const stormVisualStart = performance.now();
let homeAudioControls = null;

document.addEventListener("DOMContentLoaded", () => {
  const projectsTriggers = document.querySelectorAll("[data-open-projects]");
  const homeWindow = document.getElementById("home-window");
  const isJazzRoom = document.querySelector(".projects-page, .about-page");
  const isSunnyYard = document.querySelector(".contact-page");
  const yardBird = document.querySelector(".bird-outside");

  if (homeWindow) {
    homeAudioControls = initStormAudio();
  }

  if (isJazzRoom) {
    initJazzAudio();
  }

  if (isSunnyYard) {
    initSunnyAudio();
    initYardBird(yardBird);
  }

  if (projectsTriggers.length > 0 && homeWindow) {
    const openProjects = () => {
      if (homeWindow.classList.contains("is-opening")) {
        return;
      }

      homeAudioControls?.startAudio?.();
      homeAudioControls?.playWindowOpen?.();
      homeWindow.classList.add("is-opening");

      window.setTimeout(() => {
        window.location.href = "projetos.html";
      }, 900);
    };

    projectsTriggers.forEach((trigger) => {
      trigger.addEventListener("click", openProjects);
    });
  }
});

function initStormAudio() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioCtx();
  let started = false;
  let rainSource = null;
  let masterGain = null;

  const lightningPatterns = [
    { cycle: 4200, offset: 3440 },
    { cycle: 5100, offset: 4180 },
    { cycle: 4800, offset: 3940 }
  ];

  const startAudio = async () => {
    if (started) {
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      return;
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.2;
    masterGain.connect(audioContext.destination);

    rainSource = createRainLayer(audioContext, masterGain);
    scheduleLightningAudio(audioContext, masterGain, lightningPatterns);
    started = true;
  };

  const unlockAudio = async () => {
    try {
      await startAudio();
    } catch (error) {
      console.error("Nao foi possivel iniciar o audio da chuva:", error);
    }
  };

  unlockAudio();

  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, unlockAudio, { once: true });
  });

  window.addEventListener("beforeunload", () => {
    if (rainSource) {
      rainSource.stop();
    }

    audioContext.close();
  });

  return {
    startAudio,
    playWindowOpen: async () => {
      await startAudio();
      playWindowOpen(audioContext, masterGain);
    }
  };
}

function createRainLayer(audioContext, destination) {
  const duration = 2;
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
  const channelData = buffer.getChannelData(0);

  for (let i = 0; i < channelData.length; i += 1) {
    channelData[i] = (Math.random() * 2 - 1) * 0.55;
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const highpass = audioContext.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 700;

  const lowpass = audioContext.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 6800;

  const rainGain = audioContext.createGain();
  rainGain.gain.value = 0.065;

  const rumbleFilter = audioContext.createBiquadFilter();
  rumbleFilter.type = "lowpass";
  rumbleFilter.frequency.value = 240;

  const rumbleGain = audioContext.createGain();
  rumbleGain.gain.value = 0.018;

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(rainGain);
  rainGain.connect(destination);

  source.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGain);
  rumbleGain.connect(destination);

  source.start();
  return source;
}

function scheduleLightningAudio(audioContext, destination, patterns) {
  patterns.forEach((pattern) => {
    const loop = () => {
      const now = performance.now();
      const elapsed = now - stormVisualStart;
      const cyclesPassed = elapsed < pattern.offset
        ? 0
        : Math.floor((elapsed - pattern.offset) / pattern.cycle) + 1;
      const nextStrikeAt = stormVisualStart + pattern.offset + cyclesPassed * pattern.cycle;
      const delay = Math.max(0, nextStrikeAt - now);

      window.setTimeout(() => {
        playThunder(audioContext, destination);
        loop();
      }, delay);
    };

    loop();
  });
}

function playThunder(audioContext, destination) {
  const now = audioContext.currentTime;
  const duration = 2.8;
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i += 1) {
    const progress = i / data.length;
    const decay = 1 - progress;
    data[i] = (Math.random() * 2 - 1) * decay;
  }

  const noise = audioContext.createBufferSource();
  noise.buffer = buffer;

  const lowpass = audioContext.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(420, now);
  lowpass.frequency.exponentialRampToValueAtTime(110, now + duration);

  const thunderGain = audioContext.createGain();
  thunderGain.gain.setValueAtTime(0.0001, now);
  thunderGain.gain.exponentialRampToValueAtTime(0.22, now + 0.03);
  thunderGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  const oscillator = audioContext.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(68, now);
  oscillator.frequency.exponentialRampToValueAtTime(28, now + 1.6);

  const oscGain = audioContext.createGain();
  oscGain.gain.setValueAtTime(0.0001, now);
  oscGain.gain.exponentialRampToValueAtTime(0.05, now + 0.04);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

  noise.connect(lowpass);
  lowpass.connect(thunderGain);
  thunderGain.connect(destination);

  oscillator.connect(oscGain);
  oscGain.connect(destination);

  noise.start(now);
  noise.stop(now + duration);
  oscillator.start(now);
  oscillator.stop(now + 1.8);
}

function playWindowOpen(audioContext, destination) {
  const now = audioContext.currentTime;

  const whooshBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.8, audioContext.sampleRate);
  const whooshData = whooshBuffer.getChannelData(0);

  for (let i = 0; i < whooshData.length; i += 1) {
    const progress = i / whooshData.length;
    whooshData[i] = (Math.random() * 2 - 1) * (1 - progress);
  }

  const whoosh = audioContext.createBufferSource();
  whoosh.buffer = whooshBuffer;

  const whooshFilter = audioContext.createBiquadFilter();
  whooshFilter.type = "bandpass";
  whooshFilter.frequency.setValueAtTime(500, now);
  whooshFilter.frequency.exponentialRampToValueAtTime(1800, now + 0.4);

  const whooshGain = audioContext.createGain();
  whooshGain.gain.setValueAtTime(0.0001, now);
  whooshGain.gain.exponentialRampToValueAtTime(0.08, now + 0.06);
  whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

  const creak = audioContext.createOscillator();
  creak.type = "triangle";
  creak.frequency.setValueAtTime(180, now);
  creak.frequency.exponentialRampToValueAtTime(90, now + 0.45);

  const creakGain = audioContext.createGain();
  creakGain.gain.setValueAtTime(0.0001, now);
  creakGain.gain.exponentialRampToValueAtTime(0.035, now + 0.04);
  creakGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

  whoosh.connect(whooshFilter);
  whooshFilter.connect(whooshGain);
  whooshGain.connect(destination);

  creak.connect(creakGain);
  creakGain.connect(destination);

  whoosh.start(now);
  whoosh.stop(now + 0.8);
  creak.start(now);
  creak.stop(now + 0.55);
}

function initJazzAudio() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioCtx();
  let started = false;
  let schedulerId = null;
  let closeBound = false;

  const startAudio = async () => {
    if (started) {
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      return;
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    startJazzScheduler(audioContext);
    started = true;

    if (!closeBound) {
      window.addEventListener("beforeunload", () => {
        if (schedulerId) {
          window.clearTimeout(schedulerId);
        }

        audioContext.close();
      });

      closeBound = true;
    }
  };

  const unlockAudio = async () => {
    try {
      await startAudio();
    } catch (error) {
      console.error("Nao foi possivel iniciar o jazz ambiente:", error);
    }
  };

  unlockAudio();

  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, unlockAudio, { once: true });
  });

  function startJazzScheduler(ctx) {
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.1;
    masterGain.connect(ctx.destination);

    const chordProgression = [
      [261.63, 329.63, 392.0, 466.16],
      [293.66, 369.99, 440.0, 523.25],
      [220.0, 277.18, 329.63, 392.0],
      [246.94, 311.13, 369.99, 440.0]
    ];

    const bassRoots = [130.81, 146.83, 110.0, 123.47];
    const melodyPhrases = [
      [523.25, 587.33, 659.25, 587.33],
      [659.25, 698.46, 659.25, 587.33],
      [493.88, 523.25, 587.33, 523.25],
      [440.0, 493.88, 523.25, 587.33]
    ];
    let step = 0;

    const scheduleStep = () => {
      const now = ctx.currentTime + 0.03;
      const chordIndex = step % chordProgression.length;
      playJazzChord(ctx, masterGain, chordProgression[chordIndex], now, 2.05);
      playJazzBass(ctx, masterGain, bassRoots[chordIndex], now, 2.0);
      playJazzMelody(ctx, masterGain, melodyPhrases[chordIndex], now + 0.12, 0.44);
      playJazzBrush(ctx, masterGain, now + 0.16, 0.24);
      playJazzBrush(ctx, masterGain, now + 1.22, 0.22);

      step += 1;
      schedulerId = window.setTimeout(scheduleStep, 2400);
    };

    scheduleStep();
  }

  return { startAudio };
}

function playJazzChord(audioContext, destination, notes, startTime, duration) {
  const chordGain = audioContext.createGain();
  chordGain.gain.setValueAtTime(0.0001, startTime);
  chordGain.gain.exponentialRampToValueAtTime(0.045, startTime + 0.08);
  chordGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  chordGain.connect(destination);

  notes.forEach((note, index) => {
    const oscillator = audioContext.createOscillator();
    oscillator.type = index === 0 ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(note, startTime);

    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1450;

    oscillator.connect(filter);
    filter.connect(chordGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  });
}

function playJazzBass(audioContext, destination, note, startTime, duration) {
  const pattern = [
    { time: 0, freq: note, length: 0.34 },
    { time: 0.56, freq: note * 1.122, length: 0.28 },
    { time: 1.06, freq: note * 1.26, length: 0.26 },
    { time: 1.56, freq: note * 1.498, length: 0.3 }
  ];

  pattern.forEach((hit) => {
    const bassOsc = audioContext.createOscillator();
    bassOsc.type = "triangle";
    bassOsc.frequency.setValueAtTime(hit.freq, startTime + hit.time);

    const bassFilter = audioContext.createBiquadFilter();
    bassFilter.type = "lowpass";
    bassFilter.frequency.value = 240;

    const bassGain = audioContext.createGain();
    bassGain.gain.setValueAtTime(0.0001, startTime + hit.time);
    bassGain.gain.exponentialRampToValueAtTime(0.055, startTime + hit.time + 0.03);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, startTime + hit.time + hit.length);

    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(destination);

    bassOsc.start(startTime + hit.time);
    bassOsc.stop(startTime + hit.time + hit.length);
  });
}

function playJazzBrush(audioContext, destination, startTime, duration) {
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i += 1) {
    const progress = i / data.length;
    data[i] = (Math.random() * 2 - 1) * (1 - progress) * 0.12;
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  const filter = audioContext.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1400;

  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.012, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  source.start(startTime);
  source.stop(startTime + duration);
}

function playJazzMelody(audioContext, destination, phrase, startTime, noteSpacing) {
  phrase.forEach((note, index) => {
    const noteStart = startTime + index * noteSpacing;
    const osc = audioContext.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(note, noteStart);
    osc.frequency.exponentialRampToValueAtTime(note * 0.995, noteStart + 0.28);

    const vibrato = audioContext.createOscillator();
    vibrato.type = "sine";
    vibrato.frequency.value = 5.5;

    const vibratoGain = audioContext.createGain();
    vibratoGain.gain.value = 5;

    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1900;

    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.02, noteStart + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.34);

    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    vibrato.start(noteStart);
    vibrato.stop(noteStart + 0.34);
    osc.start(noteStart);
    osc.stop(noteStart + 0.34);
  });
}

function initSunnyAudio() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioCtx();
  let started = false;
  let breezeSource = null;
  let birdTimer = null;
  let closeBound = false;

  const startAudio = async () => {
    if (started) {
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      return;
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const masterGain = audioContext.createGain();
    masterGain.gain.value = 0.055;
    masterGain.connect(audioContext.destination);

    breezeSource = createBreezeLayer(audioContext, masterGain);
    scheduleBirds(audioContext, masterGain);
    started = true;

    if (!closeBound) {
      window.addEventListener("beforeunload", () => {
        if (breezeSource) {
          breezeSource.stop();
        }

        if (birdTimer) {
          window.clearTimeout(birdTimer);
        }

        audioContext.close();
      });

      closeBound = true;
    }
  };

  const unlockAudio = async () => {
    try {
      await startAudio();
    } catch (error) {
      console.error("Nao foi possivel iniciar o ambiente ensolarado:", error);
    }
  };

  unlockAudio();

  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, unlockAudio, { once: true });
  });

  function createBreezeLayer(ctx, destination) {
    const duration = 3;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.12;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 900;
    bandpass.Q.value = 0.4;

    const gain = ctx.createGain();
    gain.gain.value = 0.016;

    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(destination);
    source.start();

    return source;
  }

  function scheduleBirds(ctx, destination) {
    const chirp = () => {
      const now = ctx.currentTime + 0.02;
      playBirdChirp(ctx, destination, now, 1320, 1760, 0.16);

      if (Math.random() > 0.45) {
        playBirdChirp(ctx, destination, now + 0.18, 1480, 1960, 0.14);
      }

      const nextDelay = 3200 + Math.random() * 2800;
      birdTimer = window.setTimeout(chirp, nextDelay);
    };

    chirp();
  }

  return { startAudio };
}

function initYardBird(bird) {
  if (!bird) {
    return;
  }

  let cycleTimer = null;
  let phaseTimers = [];

  const clearPhaseTimers = () => {
    phaseTimers.forEach((timer) => window.clearTimeout(timer));
    phaseTimers = [];
  };

  const wait = (ms) => new Promise((resolve) => {
    const timer = window.setTimeout(resolve, ms);
    phaseTimers.push(timer);
  });

  const setBirdPosition = (x, y) => {
    bird.style.setProperty("--bird-x", `${x}px`);
    bird.style.setProperty("--bird-y", `${y}px`);
  };

  const setBirdState = (...states) => {
    bird.classList.remove(
      "is-hidden",
      "is-flying",
      "is-landed",
      "is-pecking",
      "is-scratching",
      "look-left",
      "look-right"
    );

    states.forEach((state) => bird.classList.add(state));
  };

  const randomBetween = (min, max) => min + Math.random() * (max - min);

  const getFlightPlan = () => {
    const mobile = window.innerWidth <= 768;
    const startX = randomBetween(40, mobile ? 140 : 220);
    const startY = randomBetween(48, mobile ? 140 : 180);
    const landX = randomBetween(
      mobile ? window.innerWidth * 0.34 : window.innerWidth * 0.54,
      mobile ? window.innerWidth * 0.74 : window.innerWidth * 0.8
    );
    const landY = randomBetween(mobile ? 320 : 390, mobile ? 470 : 540);
    const exitX = randomBetween(window.innerWidth + 60, window.innerWidth + 160);
    const exitY = randomBetween(mobile ? 160 : 120, landY - (mobile ? 80 : 140));

    return {
      startX,
      startY,
      landX,
      landY,
      exitX,
      exitY: Math.max(70, exitY)
    };
  };

  const runCycle = async () => {
    clearPhaseTimers();
    const plan = getFlightPlan();

    bird.style.transitionDuration = "0s";
    setBirdPosition(plan.startX, plan.startY);
    setBirdState("is-hidden", "is-flying", "look-right");

    await wait(80);
    bird.style.transitionDuration = "2.6s";
    bird.classList.remove("is-hidden");
    setBirdPosition(plan.landX, plan.landY);

    await wait(2600);
    bird.style.transitionDuration = "0.5s";
    setBirdState("is-landed", "look-left");

    await wait(randomBetween(450, 900));
    setBirdState("is-landed", "look-right");

    await wait(randomBetween(520, 980));
    setBirdState("is-landed", "look-left");

    await wait(randomBetween(280, 520));
    setBirdState("is-landed", "look-left", "is-scratching");

    await wait(1300);
    setBirdState("is-landed", Math.random() > 0.5 ? "look-right" : "look-left");

    await wait(240);
    setBirdState("is-landed", "look-left", "is-pecking");

    await wait(920);
    setBirdState("is-landed", "look-right");

    await wait(randomBetween(260, 520));
    bird.style.transitionDuration = "2.2s";
    setBirdState("is-flying", "look-right");
    setBirdPosition(plan.exitX, plan.exitY);

    await wait(2200);
    bird.classList.add("is-hidden");

    cycleTimer = window.setTimeout(runCycle, randomBetween(900, 1800));
  };

  runCycle();

  window.addEventListener("beforeunload", () => {
    clearPhaseTimers();

    if (cycleTimer) {
      window.clearTimeout(cycleTimer);
    }
  });
}

function playBirdChirp(audioContext, destination, startTime, startFreq, endFreq, duration) {
  const osc = audioContext.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(startFreq, startTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration * 0.5);
  osc.frequency.exponentialRampToValueAtTime(startFreq * 0.92, startTime + duration);

  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.018, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  const filter = audioContext.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 900;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

async function copiarEmail() {
  const emailElement = document.getElementById("email");
  const toast = document.getElementById("toast");

  if (!emailElement || !toast) {
    return;
  }

  const email = emailElement.textContent.trim();

  try {
    await navigator.clipboard.writeText(email);
    toast.textContent = "E-mail copiado com sucesso.";
  } catch (error) {
    toast.textContent = "Nao foi possivel copiar o e-mail.";
    console.error("Erro ao copiar e-mail:", error);
  }

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}
