import { fetchRecall } from './api.js';
import { countries, formatDate, safeUrl } from './recall-utils.js';
import { openImageViewer } from './image-viewer.js';

const query = new URLSearchParams(location.search);
const status = document.querySelector('#detail-status');
const returnQuery = query.get('return') || '';
const backLink = document.querySelector('#back-link');
const fromProducts = query.get('from') === 'products';
if (fromProducts) {
  backLink.href = '/products.html';
  backLink.textContent = 'Back to My Products';
}
if (returnQuery.startsWith('?'))
  backLink.href = `${fromProducts ? '/products.html' : '/recalls.html'}?${new URLSearchParams(returnQuery)}`;

function addSection(title, paragraphs) {
  const section = document.createElement('section');
  section.className = 'detail-section';
  const heading = document.createElement('h2');
  heading.textContent = title;
  section.append(heading);
  for (const text of paragraphs) {
    const p = document.createElement('p');
    p.textContent = text;
    section.append(p);
  }
  document.querySelector('#detail-sections').append(section);
}

function addFact(label, value) {
  const term = document.createElement('dt');
  term.textContent = label;
  const description = document.createElement('dd');
  description.textContent = value || 'Not provided';
  document.querySelector('#product-facts').append(term, description);
}

async function loadRecall() {
  try {
    const source = query.get('source');
    const id = query.get('id');
    if (
      !['cpsc', 'health-canada'].includes(source) ||
      !/^[1-9]\d{0,19}$/.test(id || '')
    )
      throw new Error(
        'This recall link is invalid. Return to the explorer to choose a notice.',
      );
    const recall = await fetchRecall(source, id);
    const country = countries[recall.country];
    document.title = `${recall.products[0]?.name || 'Recall details'} | RecallGuard`;
    document.querySelector('#detail-title').textContent = recall.title;
    document.querySelector('#detail-flag').src = country.flag;
    document.querySelector('#detail-source-name').textContent =
      `${country.name} · ${country.source}`;
    document.querySelector('#recall-date').textContent = formatDate(
      recall.recallDate,
    );
    document.querySelector('#updated-date').textContent = formatDate(
      recall.sourceUpdatedDate,
    );
    document.querySelector('#archived-label').hidden = !recall.archived;
    const official = safeUrl(recall.sourceUrl, true);
    const link = document.querySelector('#source-link');
    if (official) link.href = official;
    else link.hidden = true;
    addSection(
      'Hazard',
      recall.hazards.length
        ? recall.hazards
        : [
            'No separate hazard description is available. Read the official notice for more information.',
          ],
    );
    addSection(
      'What to do',
      recall.remedies.length
        ? recall.remedies
        : [
            'Read the official notice for instructions and contact information.',
          ],
    );
    if (recall.description) addSection('Description', [recall.description]);
    if (recall.consumerContact)
      addSection('Consumer contact', [recall.consumerContact]);
    addFact(
      'Product',
      recall.products.map((product) => product.name).join('\n'),
    );
    addFact('Category', recall.categories.join(', '));
    addFact('Manufacturer', recall.manufacturers.join(', '));
    if (recall.upcs.length) addFact('UPC', recall.upcs.join(', '));
    if (recall.recallNumber) addFact('Recall number', recall.recallNumber);
    if (recall.recallClass) addFact('Recall class', recall.recallClass);
    addFact('Source ID', recall.sourceId);
    for (const item of recall.images) {
      const url = safeUrl(item.url);
      if (!url) continue;
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      image.src = url;
      image.alt =
        item.caption || recall.products[0]?.name || 'Recalled product';
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => {
        figure.remove();
        document.querySelector('#image-section').hidden =
          !document.querySelector('#product-images').childElementCount;
      });
      const preview = document.createElement('button');
      preview.type = 'button';
      preview.className = 'image-preview-button';
      preview.setAttribute('aria-label', `Enlarge image: ${image.alt}`);
      preview.setAttribute('aria-haspopup', 'dialog');
      preview.addEventListener('click', () =>
        openImageViewer(image, item.caption || ''),
      );
      preview.append(image);
      figure.append(preview);
      if (item.caption) {
        const caption = document.createElement('figcaption');
        caption.textContent = item.caption;
        figure.append(caption);
      }
      document.querySelector('#product-images').append(figure);
    }
    document.querySelector('#image-section').hidden =
      !document.querySelector('#product-images').childElementCount;
    document.querySelector('#recall-detail').hidden = false;
    status.hidden = true;
  } catch (error) {
    status.textContent = error.message;
  }
}

loadRecall();
