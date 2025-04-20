import { SlowBuffer } from "buffer";
import {readFile, writeFile} from "fs/promises"

async function main() {
    const inDict = JSON.parse(await readFile("dictionary.json"))
    const structuredDict = {}

    const partsOfSpeech = [
        "k", "sj", "q", "a", "e", "hh", "r", "p", "bu", "i", "cj", "y"
    ];
    const partsOfSpeechRegexpString = `(\\b${partsOfSpeech.join("\\.|\\b")}\\.)`;
    const partsOfSpeechRegexp = new RegExp(partsOfSpeechRegexpString);

    for (const [word, def] of Object.entries(inDict)) {
        const splitDef = def.split(partsOfSpeechRegexp)
            .filter(term => term != "")
            .map(term => term.trim())
        if (splitDef.length %2 !== 0) {
            console.warn(`Unexpected split behavior! ${word}`);
        }
        const allDefs = [];
        for (let i = 0; i < splitDef.length ; i += 2) {
            const defs = splitDef[i+1].split(/\d/)
                .filter(term => term != "")
                .map(term => term.trim())
            const defObj = {
                pos: splitDef[i],
                defs
            }
            allDefs.push(defObj)
        }
        structuredDict[word] = allDefs
    }
    writeFile("structured_dictionary.json", JSON.stringify(structuredDict));
}

main()