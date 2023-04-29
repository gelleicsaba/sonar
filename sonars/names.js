exports.isPrintable = (q) => {
    return ! q.match(/[\p{Cc}\p{Cn}\p{Cs}]+/gu);
};
exports.notContains = (q, c) => {
    for (let x = 0; x < q.length; ++x) {
        c.forEach((r) => {
            if (q[x] == r) {
                return false;
            }
        });
    }
    return true;
};
exports.contains = (q, c) => {
    let n = {};
    for (let x = 0; x < q.length; ++x) {
        c.forEach((r) => {
            if (q[x] == r) {
                n[r] = true;
            }
        });
    }
    let nn = 0;
    Object.keys(n).forEach(key => {
        ++nn;
    });
    return nn == c.length;
};