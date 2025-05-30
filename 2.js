const https = require('https');
const fs = require('fs');
const path = require('path');
// Импорт ранее написанного в 1 задании кастомного JSON.stringify()
const JSONstringify = require('./1');

// TOPICBOX - поиск блоков с анекдотами <div class ="topicbox...  , [^"]* - пропускаем все символы кроме " , учитываем id анекдота , [\s\S]*? - пропускаем text анекдота , votingbox - триггер на конец анекдота
// DATE - поиск ссылки с датой , ([\d.]+) - берет дату ( цифры и точки )
// TEXT - поиск <dix class="text" , является текстом анекдота , ([\s\S]*?) - берем все символы включая теги и переносы, cleanText() удалит их
// RATING - поиск data-r ,  ([^"]+) - берем значение , далее в коде будем извлекать первое число ( видимое ) , в html есть скрытые данные которые нам не нужны data-r="131;369;217;86"
// TAGS - поиск <div class="tags" , ([\s\S]*?) - берем тег
// AUTHOR - поиск ссылки с class="auth" , [^>]* - пропускаем теги , ([^<]+) - берем текст автора , если нет => null
// TAG - поиск ссылок внутри тегов , ([^<]+) - берем текст тегов , g - глобально
// CLEAN_TEXT - удаляет html теги , <\/? - открывающий или закрывающий , [^>]+ - удаляет спецсимволы кроме >  , g - глобально
const TOPICBOX = /<div class="topicbox[^"]*"[^>]*data-id="([^"]+)"[\s\S]*?<div class="votingbox">[\s\S]*?<\/div>\s*<\/div>/g;
const DATE = /<a href="[^"]*">([\d.]+)<\/a>/;
const TEXT = /<div class="text">([\s\S]*?)<\/div>/;
const RATING = /data-r="([^"]+)"/;
const TAGS = /<div class="tags">([\s\S]*?)<\/div>/;
const AUTHOR = /<a class="auth"[^>]*>([^<]+)<\/a>/;
const TAG = /<a[^>]*>([^<]+)<\/a>/g;
const CLEAN_TEXT = /<\/?[^>]+>|\n|\t|\r/g;

// Функция очистки текста с помощью регулярного выражения CLEAN_TEXT , заменяем все пробелы на один, удаляем пробелы вначале и вконце строки
function cleanText(text) {
    if (typeof text !== 'string') return '';
    return text.replace(CLEAN_TEXT, ' ').replace(/\s+/g, ' ').trim();
}

// Строка времени для имени лог-файла , 24 часовой формат , заменяем по условию (dd.mm.yyyy hh:mm:ss)
function nowString() {
    const now = new Date();
    return now.toLocaleString('ru-RU', { hour12: false }).replace(',', ' ');
}

// Логируем ошибки , timestamp = nowString() - указание времени , logFile - название лог файла в виде {timestamp]log , fs.append - создание в пути директории лог файла
function logError(type, customError, systemError) {
    const timestamp = nowString();
    const logFile = `${timestamp}.log`;
    const log =
        `${timestamp} – ${type}:
        \nCustomError: ${customError}
        \nSystemError: ${systemError.stack || systemError}\n`;

    try {
        fs.appendFileSync(path.join(__dirname, logFile), log);
    } catch (error) {
        console.error('Ошибка записи лога:', error);
    }
}

// Парсер , принимает html в виде строки , matches - совпадение топиков анекдота, anekdots - массив для хранения анекдотов
function parseAnekdots(html) {
    const matches = html.match(TOPICBOX);
    if (!matches) return [];

    const anekdots = [];

    // Перебираем все найденные блоки topicbox и извлекаем данные через регулярные выражения , проверяем на обязаельные данные ( по условию статичные и постоянные - id , date , text , rating )
    for (const block of matches) {
        try {
            const idMatch = block.match(/data-id="([^"]+)"/);
            const dateMatch = block.match(DATE);
            const textMatch = block.match(TEXT);
            const ratingMatch = block.match(RATING);
            const tagsMatch = block.match(TAGS);
            const authorMatch = block.match(AUTHOR);

            if (!idMatch || !dateMatch || !textMatch || !ratingMatch) throw new Error('Отсутствуют обязательные данные');

            // Преобразование основных полей , id => int , date => new Date , text очищается от html тегов , rating - берем первое число
            const id = parseInt(idMatch[1]);
            const dateStr = dateMatch[1];
            const text = cleanText(textMatch[1]);
            const [day, month, year] = dateStr.split('.');
            const date = new Date(`${year}-${month}-${day}`).toISOString();
            const rating = parseInt(ratingMatch[1].split(';')[0]) || 0;

            // Массив тегов, извлекаем и очищаем от html тегов
            const tags = [];
            if (tagsMatch) {
                let tagMatch;
                // Поиск всех совпадений через .exec
                while ((tagMatch = TAG.exec(tagsMatch[1])) !== null) {
                    tags.push(cleanText(tagMatch[1]));
                }
            }

            // Проверка на наличие автрра - есть => authorMatch[1] , else - null
            const author = authorMatch ? cleanText(authorMatch[1]) : null;

            // Добавляем обработанные параметры в массив анекдотов
            anekdots.push({ id, date, text, rating, tags, author });
        } catch (error) {
            // Записываем ошибку в timestamp.log , выводим первыек 100 значений блока с ошибкой
            logError('Ошибка разбора полученного HTML', `Ошибка разбора блока:\n${block.slice(0, 100)}...`, error);
        }
    }

    // Возвращаем массив полученных анекдотов после парсинга
    return anekdots;
}

// Получаем html , принимаем строку url , создаем promise(resolve,reject) , имитируем запрос с браузера
async function fetchHtml(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        };

        // Вызываев get запрос по url , data хранит полученные данные , добавляются data+=chunk , end по завершению выбрасывает resolve с собранным html
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', err => { // При ошибке выбрасываем reject и логируем ошибку в timestamp.log
            logError('Сетевая ошибка', `Не удалось получить HTML с ${url}`, err);
            reject(err);
        });
    });
}

// Основная функция
async function parsing() {
    try {
        // Url на сайт с анекдотами , ассинхронно т.к загружаем страницу
        const html = await fetchHtml('test');
        // Передаем полученный html в parseAnekdots()
        const anekdots = parseAnekdots(html);

        // Проверка на пустое множество анекдотов => Error
        if (anekdots.length === 0) {
            throw new Error('Анекдоты не найдены');
        }

        try {
            // Записываем полученные анекдоты в anekdot.json , используем JSONstringify с 1 задания , кодировка utf-8
            fs.writeFileSync('anekdot.json', JSONstringify(anekdots, null, 2), 'utf-8');
            console.log(` Найдено ${anekdots.length} анекдотов , сохранены в  anekdot.json`);
        } catch (error) {
            // Записываем в timestamp.log ошибку
            logError('Ошибка сохранения', 'Не удалось записать в anekdot.json', error);
        }
    } catch (error) {
        // Записываем в timestamp.log ошибку
        logError('Ошибка выполнения ', 'Процесс завершился с ошибкой', error);
    }
}

// Вызываем функцию парсинга
parsing();

