const {PDFDocument, rgb, StandardFonts} = PDFLib;

window.addEventListener('error', e => {
  document.getElementById('errors').appendChild(document.createTextNode(e.error));
  document.getElementById('errors').appendChild(document.createElement('BR'));
  return false;
})
window.addEventListener('unhandledrejection', e => {
  document.getElementById('errors').appendChild(document.createTextNode(e.reason));
  document.getElementById('errors').appendChild(document.createElement('BR'));
})

function setCookie(name, value) {
  const date = new Date();
  date.setDate(date.getDate() + 365);
  document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value) +
                    '; path=/; expires=' + date.toUTCString();
}
function getCookie(name) {
  return document.cookie
         .split(';').map(c => c.trim())
         .filter(c => c.startsWith(`${name}=`))
         .map(c => decodeURIComponent(c.substring(name.length + 1)))[0];
}

const fields =
  ['title-M.', 'title-Mme', 'firstName', 'lastName', 'address', 'date']
  .reduce((acc, k) => ({...acc, [k]: document.getElementById(k)}), {});

function autoFill() {
  fields[getCookie('title') === 'Mme' ?  'title-Mme' : 'title-M.'].checked = true;
  fields['firstName'].value = getCookie('firstName') || '';
  fields['lastName'].value = getCookie('lastName') || '';
  fields['address'].value = getCookie('address') || '';
  const fortyTwoDaysAgo = new Date();
  fortyTwoDaysAgo.setDate(fortyTwoDaysAgo.getDate() - 42);
  fields['date'].value = fortyTwoDaysAgo.toISOString().slice(0, 10)
                         .replace(/-/g, '/').split('/').reverse().join('/');
}

autoFill();

function saveAutoFill() {
  setCookie('title', fields['title-Mme'].checked ? 'Mme' : 'M.');
  setCookie('firstName', fields['firstName'].value);
  setCookie('lastName', fields['lastName'].value);
  setCookie('address', fields['address'].value);
}

async function generatePDF() {
  const title = fields['title-Mme'].checked ? 'Mme' : 'M.';
  const firstName = fields['firstName'].value.trim().toUpperCase();
  const lastName = fields['lastName'].value.trim().toUpperCase();
  const fullName = `${title} ${firstName} ${lastName}`.toUpperCase();
  const address = fields['address'].value.trim().toUpperCase();
  const billDate = new Date(fields['date'].value.split('/').reverse().join('/')).getTime();

  const pdfDoc = await PDFDocument.load(
    await (await fetch('facture-vierge.pdf')).arrayBuffer(),
    {updateMetadata: false});
  const firstPage = pdfDoc.getPages()[0];
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica),
        helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        courierBold = await pdfDoc.embedFont(StandardFonts.CourierBold);
  const black = rgb(0, 0, 0),
        white = rgb(1, 1, 1),
        grey = rgb(0.4, 0.4, 0.4),
        blue = rgb(0, 0.44, 0.73);

  (fullName + '\n' + address).split('\n').forEach((line, i, arr) => {
    firstPage.drawText(line, {
      x: 320,
      y: 689 - 11 * i,
      size: 10,
      font: courierBold,
      color: black,
    });
  });
  address.split('\n').forEach((line, i, arr) => {
    firstPage.drawText(line, {
      x: 22,
      y: 466 - 28 * i / arr.length,
      size: 10,
      font: helvetica,
      color: grey,
    });
  });
  firstPage.drawText(fullName, {
    x: 22,
    y: 422,
    size: 10,
    font: helvetica,
    color: grey,
  });
  firstPage.drawText(
    lastName,
    {x: 378, y: 89, size: 9, font: helvetica, color: grey});

  firstPage.drawText(
    'Votre facture du ' +
    new Date(billDate).toLocaleDateString('fr-FR') +
    ' N° 23 501 364 101',
    {x: 246, y: 583.5, size: 9.5, font: helveticaBold, color: blue});
  firstPage.drawText(
    new Date(billDate + 15*24*3600*1000).toLocaleDateString('fr-FR'),
    {x: 487, y: 473, size: 11, font: helvetica, color: white});
  firstPage.drawText(
    'Prochaine facture vers le ' +
    new Date(billDate + 58*24*3600*1000).toLocaleDateString('fr-FR') +
    ' - Prochain relevé vers le ' +
    new Date(billDate + 181*24*3600*1000).toLocaleDateString('fr-FR'),
    {x: 224, y: 453.5, size: 9, font: helveticaBold, color: blue});
  firstPage.drawText(
    new Date(billDate + 15*24*3600*1000).toLocaleDateString('fr-FR'),
    {x: 383, y: 111.5, size: 8, font: helvetica, color: grey});

  return pdfDoc;
}

async function display() {
  const pdfDoc = await generatePDF();
  const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });
  document.getElementById('pdf').src = pdfDataUri;
  saveAutoFill();
}

async function save() {
  const pdfDoc = await generatePDF();
  const pdfBytes = await pdfDoc.save();
  download(pdfBytes, 'facture ÉDF.pdf', 'application/pdf');
  saveAutoFill();
}

display();
