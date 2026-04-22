const story = {
  Intro: {
    text: `Every morning, the man descended into the underground, letting the rhythm of the subway absorb him into anonymity. 
    He went to work, completed his tasks efficiently, returned home to his family, and repeated the cycle without disruption. 
    Nothing was overtly wrong with his life, yet everything felt muted, as though he were watching himself through frosted glass. 
    He doubted his own importance, spoke little, and when he did, his words seemed to dissolve before they reached anyone else. 
    The days were grey—not painful, not joyful, simply endured.`,
    choices: [
      { label: "Routine Continues", target: "Routine Continues" },
      { label: "Meeting on the Train", target: "Meeting on the Train" }
    ]
  },

  "Routine Continues": {
    text: `The routine persisted, and over time he learned to accept it as sufficient. The subway rides blended together, 
    work remained predictable, and home offered a quiet stability that required no emotional risk. He was not happy, but he 
    reminded himself that happiness was an unreasonable expectation, a luxury rather than a necessity. Occasionally, a 
    fleeting wish for something more crossed his mind, but he dismissed it quickly, telling himself that worse lives existed, 
    and that quiet endurance was a kind of success.`,
    choices: [
      { label: "The Accident", target: "The Accident" },
      { label: "The Harbour", target: "The Harbour" }
    ]
  },

  "Meeting on the Train": {
    text: `One morning, a woman sat beside him and asked a simple question, and unlike before, he answered without retreating 
    inward. They talked, first awkwardly and then with growing ease, and she listened as though his thoughts carried weight. 
    In her presence, he felt suddenly visible, his words landing instead of vanishing, his doubts loosening their grip. The 
    subway ride shortened, the city seemed sharper in color, and for the first time, he recognized the feeling blooming in 
    his chest as genuine happiness—fragile perhaps, but unmistakably real.`,
    choices: [
      { label: "Duty and Silence", target: "Duty and Silence" },
      { label: "Finding Each Other", target: "Finding Each Other" }
    ]
  },

  "The Accident": {
    text: `One evening, exhausted after a long and tedious day at work, he walked toward the subway lost in his own thoughts, 
    unaware of the world tightening around him. As he crossed the street, a car ran the red light and struck him before he 
    could react, his body colliding with the pavement in a moment of sudden, irreversible silence. He lingered for several 
    days in the hospital, suspended between machines and dim conversations he could no longer answer, and then quietly passed 
    away, leaving behind a life that had never truly asked anything of the world, nor felt fully acknowledged by it.
    <br>
    <br>
    The end`,
    choices: []
  },

  "The Harbour": {
    text: `One evening, exhausted after a long and tedious day at work, he stopped short on his way to the subway as a thought 
    surfaced: Let’s go to the harbour, let's breath for a bit. He changed direction, walking until the city opened into water 
    and sky, where the sea reflected the fading light and slowed his breathing. There, he met a woman and they began to talk, 
    first hesitantly and then without restraint, walking along the shore as words came easily and lingered warmly between them. 
    They were both living within lives already constructed—relationships, families, obligations shaped by years of promises 
    and expectations. But, for the first time in his life, he felt truly seen and heard, and the grey weight he had carried 
    for years loosened, replaced by a quiet, undeniable happiness.`,
    choices: [
      { label: "Choosing to Try", target: "Choosing to Try" }
    ]
  },

  "Duty and Silence": {
    text: `Despite what grew between them, reality remained immovable. They were both living within lives already 
    constructed—relationships, families, obligations shaped by years of promises and expectations. Love, no matter 
    how profound, could not undo that weight without consequence, and so he buried his feelings deep within himself, 
    where no one else could discover them. The connection survived only as a quiet ache, carried privately, a reminder 
    of what might have been but was never allowed to exist.
    <br>
    <br>
    The end`,
    choices: []
  },

  "Finding Each Other": {
    text: `They were both living within lives already constructed—relationships, families, obligations shaped by years of 
    promises and expectations. But, the more they talked, the more unmistakable it became that each of them held something 
    the other had always lacked. They spent time together whenever life allowed it, sharing thoughts carved out of stolen 
    hours and unguarded moments. Both loved nature, both found solace in long walks along the shore, where conversation 
    flowed as steadily as the tide.`,
    choices: [
      { label: "Choosing to Try", target: "Choosing to Try" }
    ]
  },

  "Choosing to Try": {
    text: `They found themselves returning again and again to the same place, walking side by side along the beach, talking 
    as if conversation itself were a form of shelter. The sea became a constant presence, listening without judgment as they 
    shared doubts, memories, and hopes they had never spoken aloud to anyone else. One light afternoon, at the far end of the 
    pier, the world seemed briefly uncomplicated, the horizon stretched wide and forgiving. They stopped and looked long into 
    each other’s eyes, aware of the risks, the uncertainty, and the fragile courage it would require. Then he spoke the words 
    that made everything else fall silent: “Let’s try.”`,
    choices: [
      { label: "Ending 1", target: "Ending 1" },
      { label: "Ending 2", target: "Ending 2" }
    ]
  },

  "Ending 1": {
    text: `And she answered: “No. It’s impossible. I can’t allow myself to feel this way.” After that, she left, and his life 
    slowly became grey again.
    <br>
    <br>
    The end`,
    choices: []
  },

  "Ending 2": {
    text: `And she answered: “Yes. It’s scary, but we’re together.” After that, they finished their walk, and their lives never, 
    ever became grey again.
    <br>
    <br>
    The end`,
    choices: []
  }
};

const passageText = document.getElementById("passage-text");
const choicesDiv = document.getElementById("choices");

function showPassage(name) {
  const passage = story[name];

  passageText.innerHTML = passage.text;
  choicesDiv.innerHTML = "";

  passage.choices.forEach(choice => {
    const btn = document.createElement("button");
    btn.textContent = choice.label;
    btn.onclick = () => showPassage(choice.target);
    choicesDiv.appendChild(btn);
  });
}

// start story
showPassage("Intro");

