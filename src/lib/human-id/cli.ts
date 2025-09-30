import { humanId } from './index';

const options = {
    adjectiveCount: 1,
    addAdverb: false,
    separator: '-',
    capitalize: false,
};

console.log(humanId(options));
