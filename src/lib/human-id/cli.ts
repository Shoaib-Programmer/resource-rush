import { humanId } from './index';

const options = {
    adjectiveCount: 1,
    addAdverb: false,
    separator: '-',
    capitalize: false,
};
let reps = 1;

for (let i = 0; i < reps; i++) {
    console.log(humanId(options));
}
