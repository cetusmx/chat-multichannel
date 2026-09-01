const fs = require('fs');
let code = fs.readFileSync('frontend/src/features/chat/components/ChatActionModals.jsx', 'utf8');

// 1. Update useEffect for smart default
const useEffectRegex = /if \(activeModal === 'SCHEDULED'\) \{\s*const date = new Date\(Date\.now\(\) \+ 24 \* 60 \* 60 \* 1000\);\s*setScheduledAt\(new Date\(date\.getTime\(\) - date\.getTimezoneOffset\(\) \* 60000\)\.toISOString\(\)\.slice\(0, 16\)\);\s*\}/;
const useEffectReplacement = `if (activeModal === 'SCHEDULED') {
        const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
        date.setMinutes(0, 0, 0);
        setScheduledAt(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      }`;
code = code.replace(useEffectRegex, useEffectReplacement);

// 2. Add validation in handleScheduledSubmit
const submitRegex = /const \[year, month, day, hour, minute\] = scheduledAt\.split\(\/\[-T:\]\/\)\.map\(Number\);\s*const selectedDate = new Date\(year, month - 1, day, hour, minute\);/;
const submitReplacement = `const [year, month, day, hour, minute] = scheduledAt.split(/[-T:]/).map(Number);
      if (minute !== 0) {
        alert('Por favor, selecciona una hora en punto (ej. 15:00). El sistema evalúa programaciones al inicio de cada hora.');
        return;
      }
      const selectedDate = new Date(year, month - 1, day, hour, minute);`;
code = code.replace(submitRegex, submitReplacement);

// 3. Update min and max in input
const inputRegex = /min=\{new Date\(Date\.now\(\) - new Date\(\)\.getTimezoneOffset\(\) \* 60000 \+ 15 \* 60000\)\.toISOString\(\)\.slice\(0, 16\)\}\s*max=\{new Date\(Date\.now\(\) - new Date\(\)\.getTimezoneOffset\(\) \* 60000 \+ 30 \* 24 \* 60 \* 60000\)\.toISOString\(\)\.slice\(0, 16\)\}/;
const inputReplacement = `step="3600"
                    min={(() => {
                      const d = new Date();
                      d.setHours(d.getHours() + 1, 0, 0, 0);
                      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    })()}
                    max={(() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 30);
                      d.setMinutes(0, 0, 0);
                      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    })()}`;
code = code.replace(inputRegex, inputReplacement);

// Remove the 15-minute validation since we now require next whole hour
const minTimeRegex = /if \(selectedDate\.getTime\(\) < Date\.now\(\) \+ 15 \* 60000\) \{\s*alert\('La fecha programada debe ser al menos 15 minutos en el futuro\.'\);\s*return;\s*\}/;
const minTimeReplacement = `if (selectedDate.getTime() <= Date.now()) {
        alert('La fecha programada debe ser en el futuro.');
        return;
      }`;
code = code.replace(minTimeRegex, minTimeReplacement);


fs.writeFileSync('frontend/src/features/chat/components/ChatActionModals.jsx', code);
console.log('Fixed ChatActionModals for exact hours');
