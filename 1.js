// JSON.stringify(value,replacer,space) , replacer(key,value)
function JSONstringify(value, replacer, space) {

    // кладем обьект как ключ, когда сборщик удалит обьект из памяти, данные связанные с ним тоже исчезнут
    const weakSet = new WeakSet();

    // Проверяем на циклические ссылки, если есть ссылка на обьект - цикл => TypeError
    // исключаем null , т.к typeof null == 'object'
    function checkCircular(obj) {
        if (typeof obj === 'object' && obj !== null) {
            if (weakSet.has(obj)) {
                throw new TypeError('Циклические ссылки');
            }
            weakSet.add(obj);
        }
    }

    // реализация методов JSON.stringify()
    function stringify(value, func, indent) {

        // Обработка bigint
        if (typeof value === 'bigint') {
            throw new TypeError("Ошибка, слишком большое число");
        }

        // Обработка undefined, function и symbol
        if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
            return undefined;
        }

        // Обработка null
        if (value === null) {
            return 'null';
        }

        // Обработка boolean
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }

        // Обработка чисел
        if (typeof value === 'number') {
            // NaN || Infinity => null
            if (isNaN(value) || !isFinite(value)) {
                return 'null';
            }
            return value.toString();
        }

        // Обработка строки , убираем управляющие и удаляющие символы , g - глобальный флаг , escapeChar - функция определяющая как заменить найденные символы
        if (typeof value === 'string') {
            return '"' + value.replace(/[\u0000-\u001f"\\\u007f-\u009f]/g, escapeChar) + '"';
        }

        // Обработка объектов и проверка на цикличность
        if (typeof value === 'object') {
            checkCircular(value);

            // Обработка Date , преобразуем в строку , проверяем на валидность через isFinite
            if (value instanceof Date) {
                return isFinite(value.valueOf()) ? '"' + value.toISOString() + '"' : 'null';
            }

            // Обработка массива
            if (Array.isArray(value)) {
                // Создание временного массива , проходим по массиву и вызываем stringify для каждого элемента , сохраняем в result , добавляем результат во временный массив , undefined заменяется на null
                let partial = [];
                for (let i = 0; i < value.length; i++) {
                    const item = value[i];
                    let result;
                    try {
                        result = stringify(item, func, indent);
                    } catch (error) {
                        if (error instanceof TypeError && error.message.includes('Циклические ссылки')) {
                            throw error;
                        }
                        result = 'null';
                    }
                    partial.push(result === undefined ? 'null' : result);
                }
                // Вывод массива как в JSON.stringify()
                return '[' + partial.join(',') + ']';
            } else {
                // Обработка обычных объектов , хранятся в виде "ключ":значение
                let properties = [];
                const keys = Object.keys(value);

                // Фильтрация ключей , func аналогичен replacer в JSON.stringify()
                let filteredKeys = keys;
                if (Array.isArray(func)) {
                    filteredKeys = func.filter(key => {
                        if (typeof key === 'string' || typeof key === 'number') {
                            return keys.includes(key.toString());
                        }
                        return false;
                    });
                }

                // Каждое свойство преобразуется в строку "key":value
                for (const key of filteredKeys) {
                    // Получаем значение свойств
                    const propertyValue = value[key];
                    let result;
                    try {
                        result = stringify(propertyValue, func, indent);
                    } catch (error) {
                        if (error instanceof TypeError && error.message.includes('Циклические ссылки')) {
                            throw error;
                        }
                        continue;
                    }

                    // Формируем пары "key":value
                    if (result !== undefined) {
                        const propertyName = stringify(key);
                        properties.push(propertyName + ':' + result);
                    }
                }

                // Применение функции replacer , если является функцией
                if (typeof func === 'function') {
                    properties = [];
                    // Проходимся по всем key обьекта, извлекаем value[key] , применяем replacer аналогично JSON.stringify()
                    for (const key of keys) {
                        const propertyValue = value[key];
                        const replacedValue = func(key, propertyValue);
                        const result = stringify(replacedValue, null, indent);
                        // Записываем в виде "key":value
                        if (result !== undefined) {
                            const propertyName = stringify(key);
                            properties.push(propertyName + ':' + result);
                        }
                    }
                }
                return '{' + properties.join(',') + '}';
            }
        }

        return undefined;
    }

    // Заменяем специальные символы
    function escapeChar(c) {
        const escapeMap = {
            '\b': '\\b',  // Backspace
            '\t': '\\t',  // Horizontal tab
            '\n': '\\n',  // New line
            '\f': '\\f',  // Form feed
            '\r': '\\r',  // Carriage return
            '"': '\\"',   // Double quote
            '\\': '\\\\'  // Backslash
        };

        // Проверка наличия символа в таблице
        if (escapeMap[c]) {
            return escapeMap[c];
        }

        // Обработка символов не вошедших в escapeChar , получаем Unicode символа , преобразуем в 16ричное представление , 4 значный формат
        const code = c.charCodeAt(0);
        return '\\u' + ('0000' + code.toString(16)).slice(-4);
    }

    // Обработка параметра replacer
    let func = null;
    if (typeof replacer === 'function') {
        func = replacer;
    } else if (Array.isArray(replacer)) {
        func = replacer;
    }

    // Обработка параметра space
    let indent = '';
    if (typeof space === 'number') {
        if (space > 0) {
            indent = ' '.repeat(space)
        }
    } else if (typeof space === 'string') {
        indent = space;
    }

    // Основной вызов
    try {
        const result = stringify(value, func, indent);

        // Добавляем отступы если указаны
        if (indent) {
            return addIndent(result, indent);
        }

        return result === undefined ? undefined : result;
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('Циклические ссылки')) {
            throw error;
        }
        return undefined;
    }
}

// Преобразует строку в читаемый вид с отступами и переносами строки
function addIndent(json, indent) {
    let i = 0; // index символа
    let inString = false; // flag нахождения в строке
    let result = '';
    let indentLevel = 0; // уровень вложенности
    const newline = '\n';

    // Проходимся по каждому символу
    while (i < json.length) {
        const char = json[i];

        // Определяем находимся ли мы внутри строки , \" - не считается концом строки
        if (char === '"' && json[i-1] !== '\\') {
            inString = !inString;
        }

        if (!inString) {
            // Добавляем перенос строки, увеличиваем уровень вложенности , добавляем отступы
            if (char === '{' || char === '[') {
                result += char + newline + indent.repeat(++indentLevel);
                i++;
                continue;
            } else if (char === '}' || char === ']') { // Добавляем перенос строки, уменьшаем уровень вложенности, добавляем отступы
                result += newline + indent.repeat(--indentLevel) + char;
                i++;
                continue;
            } else if (char === ',') { // Перенос строки после запятой ","
                result += char + newline + indent.repeat(indentLevel);
                i++;
                continue;
            } else if (char === ':') { // Пробел после ":" для читаемости
                result += char + ' ';
                i++;
                continue;
            }
        }

        // Обработка обычных символов
        result += char;
        i++;
    }

    return result;
}

module.exports = JSONstringify;
