const JSONstringify = require('./1');

describe('JSONstringify', () => {

    // 1
    test('Обычные значения ', () => {
        expect(JSONstringify(null)).toBe(JSON.stringify(null));
        expect(JSONstringify(true)).toBe(JSON.stringify(true));
        expect(JSONstringify(false)).toBe(JSON.stringify(false));
        expect(JSONstringify(42)).toBe(JSON.stringify(42));
        expect(JSONstringify(3.14)).toBe(JSON.stringify(3.14));
        expect(JSONstringify('text')).toBe(JSON.stringify('text'));
        expect(JSONstringify('')).toBe(JSON.stringify(''));
    });

    // 2
    test('Специальные значения', () => {
        expect(JSONstringify(NaN)).toBe(JSON.stringify(NaN));
        expect(JSONstringify(Infinity)).toBe(JSON.stringify(Infinity));
        expect(JSONstringify(-Infinity)).toBe(JSON.stringify(-Infinity));
        expect(JSONstringify(undefined)).toBe(JSON.stringify(undefined));
        expect(JSONstringify(() => {})).toBe(JSON.stringify(() => {}));
        expect(JSONstringify(Symbol('sym'))).toBe(JSON.stringify(Symbol('sym')));
    });

    // 3
    test('Массивы', () => {
        expect(JSONstringify([1, 'two', true])).toBe(JSON.stringify([1, 'two', true]));
        expect(JSONstringify([null, undefined, NaN])).toBe(JSON.stringify([null, undefined, NaN]));
        expect(JSONstringify([[1, 2], [3, 4]])).toBe(JSON.stringify([[1, 2], [3, 4]]));
    });

    // 4
    test('Простые объекты', () => {
        const obj = { a: 1, b: 'two', c: true };
        expect(JSONstringify(obj)).toBe(JSON.stringify(obj));

        const nested = { a: { b: { c: 1 } } };
        expect(JSONstringify(nested)).toBe(JSON.stringify(nested));
    });

    // 5
    test('Объекты Date', () => {
        const date = new Date();
        expect(JSONstringify(date)).toBe(JSON.stringify(date));

        const invalidDate = new Date('invalid');
        expect(JSONstringify(invalidDate)).toBe(JSON.stringify(invalidDate));
    });

    // 6
    test('Функция replacer', () => {
        const obj = { a: 1, b: 'two', c: true, d: 'remove' };

        function replacer(key, value) {
            return key === 'd' ? undefined : value;
        }

        expect(JSONstringify(obj, replacer)).toBe(JSON.stringify(obj, replacer));
    });

    test('Массив replacer', () => {
        const obj = { a: 1, b: 'two', c: true, d: 'remove' };
        expect(JSONstringify(obj, ['a', 'c'])).toBe(JSON.stringify(obj, ['a', 'c']));
    });

    // 7
    test('Форматирование с space', () => {
        const obj = { a: 1, b: [2, 3] };

        expect(JSONstringify(obj, null, 2)).toBe(JSON.stringify(obj, null, 2));
        expect(JSONstringify(obj, null, '--')).toBe(JSON.stringify(obj, null, '--'));
    });

    // 8
    test('Циклические ссылки', () => {
        const obj = {};
        obj.self = obj;

        expect(() => JSONstringify(obj)).toThrow(TypeError);
        expect(() => JSON.stringify(obj)).toThrow(TypeError);
    });



    // 9
    test('Замена специальных симоволов', () => {
        const specialString = 'test\ntest\t"test"\\test';
        expect(JSONstringify(specialString)).toBe(JSON.stringify(specialString));
    });

    // 10
    test('Комплексные объекты', () => {
        const complexObj = {
            date: new Date(),
            arr: [1, null, { x: undefined, y: NaN }],
            str: 'text\ntest\ttext',
            bool: true,
            nested: {
                a: 1,
                b: 'three'
            }
        };

        expect(JSONstringify(complexObj, null, 2))
            .toBe(JSON.stringify(complexObj, null, 2));
    });

    // 11
    test('Крайние случаи', () => {
        expect(JSONstringify('')).toBe(JSON.stringify(''));
        expect(JSONstringify({ '': '' })).toBe(JSON.stringify({ '': '' }));
        expect(JSONstringify([, , ,])).toBe(JSON.stringify([, , ,]));
    });
});