setInterval(() => {
    let x = 1;
    let obj = {
        a: 3,
        b: 4,
        get accessorProp() { return this.a; },
        set accessorProp(x) { this.a = x; },
    };
    let y = x;
    let obj2 = obj;
}, 0);
//# sourceMappingURL=script.js.map