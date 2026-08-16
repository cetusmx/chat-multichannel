const fs = require('fs');
const pdfParse = require('pdf-parse');

async function test() {
  try {
    const dataBuffer = fs.readFileSync('../CSF.pdf');
    const data = await pdfParse(dataBuffer);
    let pdfText = data.text;
    
    const extractBetween = (startStr, endStrs) => {
      let startIndex = pdfText.indexOf(startStr);
      if (startIndex === -1) return '';
      startIndex += startStr.length;
      
      let endIndex = pdfText.length;
      for (const endStr of endStrs) {
        const idx = pdfText.indexOf(endStr, startIndex);
        if (idx !== -1 && idx < endIndex) {
          endIndex = idx;
        }
      }
      return pdfText.substring(startIndex, endIndex).replace(/\n/g, ' ').trim();
    };

    const cp = extractBetween('CódigoPostal:\n', ['\n', 'Tipo']);
    const vialidad = extractBetween('NombredeVialidad:', ['NúmeroExterior:', '\n']);
    const numExt = extractBetween('NúmeroExterior:', ['NúmeroInterior:', '\n']);
    const numInt = extractBetween('NúmeroInterior:', ['Nombredela Colonia:', '\n']);
    const colonia = extractBetween('Nombredela Colonia:\n', ['\n', 'Nombredela Localidad:']);
    const localidad = extractBetween('Nombredela Localidad:', ['NombredelMunicipio', '\n']);
    const municipio = extractBetween('DemarcaciónTerritorial:', ['Nombredela EntidadFederativa:', '\n']);
    const entidad = extractBetween('Nombredela EntidadFederativa:', ['EntreCalle:', '\n']);
    
    console.log({ cp, vialidad, numExt, numInt, colonia, localidad, municipio, entidad });
  } catch(e) { console.error(e) }
}
test();
