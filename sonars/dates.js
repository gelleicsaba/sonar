exports.isRealDate = (q) => {
    return (new Date(q + 'T12:00:00Z')).toDateString() != 'Invalid Date';
};
exports.currentYear = (q) => {
    return (new Date()).getFullYear() + q;
};
exports.yearOf = (q) => {
    return new Date(q + 'T12:00:00Z').getFullYear();
};
