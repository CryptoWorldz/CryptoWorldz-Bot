(async () => {
  const list = document.getElementById('program-list');
  if (!list) return;
  try {
    const response = await fetch('/turn-up-town/programs.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Program list unavailable');
    const data = await response.json();
    if (!Array.isArray(data.programs)) throw new Error('Invalid program list');
    list.replaceChildren();
    for (const program of data.programs) {
      const card = document.createElement('article');
      card.className = 'card';
      const tag = document.createElement('div');
      tag.className = 'tag';
      tag.textContent = `${program.pathway} · ${program.status}`;
      const heading = document.createElement('h3');
      heading.textContent = program.name;
      const reward = document.createElement('p');
      reward.textContent = program.reward;
      const eligibility = document.createElement('p');
      eligibility.textContent = `Who qualifies: ${program.eligibility}`;
      const proof = document.createElement('p');
      proof.textContent = `Proof: ${program.proof}`;
      const link = document.createElement('a');
      link.href = program.destination;
      link.textContent = 'Read the program →';
      card.append(tag, heading, reward, eligibility, proof, link);
      list.append(card);
    }
  } catch {
    list.textContent = 'Program details are temporarily unavailable. Please check back before attempting a claim.';
  }
})();
