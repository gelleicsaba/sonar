class Sonars { 
	/* created from this letters : jSONpARSe */
	
	constructor(obj, template) {
		this.result = undefined;
		this.tree = [];
		this.tabs = 4;
		this.obj = obj;
		this.template = template.replace("\r","").replace("\t", this.tabs);
		this.imports = {};
		this.build();
	};
	

	build() {
		const t = this;
		if (t.result != undefined) {
			return;
		}
		let sp = t.template.split("\n");
		t.tree = Array(sp.length);
		for (let x = 0; x < sp.length; ++x) {
			t.tree[x] = { id: x, level: 0, parent: (x > 0 ? x : -1), cmd: "", path: "", active: true, errors: [] };
		}
		for (let x = 0; x < sp.length; ++x) {
			let row = sp[x];
			let rowT = row.trim();
			if (rowT == "") {
				t.tree[x].active = false;
			}
			let lvl = 0;
			for (let y = 0; y < row.length; ++y) {
				if (row[y] != ' ') {
					lvl = y;
					break;
				}
			}
			t.tree[x].level = lvl;
			t.tree[x].cmd = rowT;
			if (lvl > 0) {
				const parentLvl = lvl - t.tabs;
				if (parentLvl == 0) {
					t.tree[x].parent = 0;
				} else {
					for (let z = x - 1; z > 0; --z) {
						if (t.tree[z].level == parentLvl && (t.tree[z].cmd[0] == "{" || t.tree[z].cmd[0] == "[" || t.tree[z].cmd[0] == "@")) {
							t.tree[x].parent = z;
							break;
						}
					}
				}
			}
		}
		t.buildPath();
	}

	buildPath() {
		const t = this;
		if (t.result != undefined) {
			return;
		}
		for (let x = t.tree.length - 1; x >= 0; --x) {
			if (! t.tree[x].active) {
				continue;
			}
			let y = x;			
			while (t.tree[y].parent != -1) {
				switch (t.tree[y].cmd[0]) {
					case "{": case "[": case "@":
						let elementName = t.tree[y].cmd.split(" ")[0];
						t.tree[x].path = elementName + t.tree[x].path;
						break;
				}
				y = t.tree[y].parent;
			}
			t.tree[x].path = t.tree[0].cmd.split(" ")[0] + t.tree[x].path;
		}
	}

	check() {
		const t = this;
		if (t.result != undefined) {
			return;
		}
		t.checkRecursive(t.obj, "");
		t.result = t.createResult();
		return t.result;
	}

	checkRecursive(q, path) {
		const t = this;
		if (t.isObject(q)) {
			path += "{";
			let keys = [];
			Object.keys(q).forEach(key => {
				t.checkRecursive(q[key], path + "@" + key);
				keys.push(key);
			});			
			t.checkRequiredRules(q, path, keys);
		} else if (t.isArray(q)) {
			path += "[";
			q.forEach((item) => {
				t.checkRecursive(item, path);
			});
			t.checkSizeRules(q, path);
		} else {
			t.checkElement(q, path);
		}
		return path;
	}

	checkElement(obj, path) {
		const t = this;
		const elements = t.tree.filter((q) => { return q.path == path });
		const element = elements.filter((q) => { return q.cmd[0] == "@"; })[0];
		if (element == undefined || element['cmd'] == undefined) return;
		const varname = element.cmd.split("->")[1].trim().split(" ")[0].trim();
		/* type errors */
		if (element.cmd.indexOf(" Int") != -1 && ! t.isInt(obj)) {
			const ename = element.cmd.split("->")[0].trim().split("@")[1];
			const errmsg = "The '" + ename + "' must be an integer";
			const errObj = { type: "Type.Int", element: ename, value: obj, code: 0, path: path, message: errmsg }; 
			element.errors.push(errObj);
			return;
		} else if (element.cmd.indexOf(" Float") != -1 && ! t.isFloat(obj)) {
			const ename = element.cmd.split("->")[0].trim().split("@")[1];
			const errmsg = "The '" + ename + "' must be a float";
			const errObj = { type: "Type.Float", element: ename, value: obj, code: 0, path: path, message: errmsg }; 
			element.errors.push(errObj);
			return;
		} else if (element.cmd.indexOf(" String") != -1 && ! t.isString(obj) ) {
			const ename = element.cmd.split("->")[0].trim().split("@")[1];
			const errmsg = "The '" + ename + "' must be a string";
			const errObj = { type: "Type.String", element: ename, value: obj, code: 0, path: path, message: errmsg }; 
			element.errors.push(errObj);
			return;
		} else if (element.cmd.indexOf(" Bool") != -1 && ! t.isBool(obj) ) {
			const ename = element.cmd.split("->")[0].trim().split("@")[1];
			const errmsg = "The '" + ename + "' must be a boolean";
			const errObj = { type: "Type.Bool", element: ename, value: obj, code: 0, path: path, message: errmsg }; 
			element.errors.push(errObj);
			return;
		}
		/* imports, watches & rule errors */
		const importElements = elements.filter((q) => { return q.cmd.startsWith("#Import"); } );
		let imports = "";
		importElements.forEach((q) => {
			const impName = q.cmd.split("#Import")[1].trim().split("->")[0].trim().split("'")[1];
			const impConst = q.cmd.split("#Import")[1].trim().split("->")[1].trim();
			imports += "const " + impConst + " = require('./" + impName + ".js');";
		});
		const watches = elements.filter((q) => { return q.cmd.startsWith("#Watch") || q.cmd.startsWith("#Const") || q.cmd.startsWith("#Set"); } );
		const rules = elements.filter((q) => { return q.cmd.startsWith("->"); } );
		let watchEval = undefined;
		let varConst = undefined; /* this will be used only to replace the $ names in the error message */
		if (typeof obj === 'string' || obj instanceof String) {
			watchEval = imports + "let " + varname + " = '" + obj + "'; ";
		} else {
			watchEval = imports + "let " + varname + " = " + obj + "; ";
		}
		varConst = watchEval;
		let watchValues = {};
		watches.forEach((q) => {
			const operation = q.cmd.split("{")[1].split("}")[0];
			if (q.cmd.indexOf("#Const") !== -1) {
				watchEval += "const " + operation + "; ";
			} else if (q.cmd.indexOf("#Watch") !== -1) {
				watchEval += "let " + operation + "; ";
			} else if (q.cmd.indexOf("#Set") !== -1) {
				watchEval += operation + "; ";
			}
			const watchVarName = operation.split("=")[0].trim();
			const watchValueEval = operation.split("=")[1].trim();
			watchValues[watchVarName] = watchValueEval;
		});
		rules.forEach((q) => {
			const operation = q.cmd.split("{")[1].split("}")[0];
			const evlText = "(() => { " + watchEval + "return " + operation + "; })()";
			const evl = eval(evlText);
			if (! evl) {
				const errcode = q.cmd.split("->")[2].split("(")[1].split(")")[0];
				const errmsg = q.cmd.split("->")[3].replace('"',"").trim();
				const ename = element.cmd.split("->")[0].trim().split("@")[1];
				const errObj = { type: "Rule", element: ename, value: obj, code: errcode, path: q.path, message: t.replacesErrorText(errmsg, varConst, watchValues) };
				q.errors.push(errObj);
			}
		});

	}


	replacesErrorText(msg, varConst, q) {
		Object.keys(q).forEach(key => {
			const evl = eval("(() => { "+ varConst  +" return ''+"+ q[key] +"; })()");
			msg = msg.replace("$" + key + ":", evl);
		});
		return msg;
	}



	checkRequiredRules(obj, path, keys) {
		const t = this;
		const parentElement = t.tree.filter((q) => { return q.path == path })[0];
		const elements = t.tree.filter((q) => { return q.parent == parentElement.id && q.cmd[0] == "@" && q.cmd.indexOf(" Required") != -1; });
		elements.forEach((q) => {
			const key = q.cmd.split("->")[0].trim().split("@")[1];
			if (obj[key] == undefined) {
				const errmsg = "The '"+ key +"' is required";
				const errObj = { type: "Required", element: key, code: 0, path: q.path, message: errmsg }; 
				q.errors.push(errObj);
			}
		});
	}

	checkSizeRules(obj, path) {
		const t = this;
		const element = t.tree.filter((q) => { return q.path == path })[0];
		const parentElement = t.tree[element.parent];
		if (element.cmd.indexOf(" OneOrMore") != -1 && obj.length == 0) {
			let parentName = undefined;
			if (parentElement.cmd[0] == "@") {
				parentName = parentElement.cmd.split("->")[0].trim().split("@")[1];
			} else {
				let pr = t.tree[element.parent];
				while (pr.cmd[0] != "@" && pr.parent > 0) {
					pr = pr.cmd;
				}
				parentName = pr.cmd.split("->")[0].trim().split("@")[1];
			}
			const errmsg = "The number of the elements must be at least 1";
			const errObj = { type: "Size.OneOrMore", element: parentName, code: 0, path: element.path, message: errmsg }; 
			element.errors.push(errObj);
		}
		if (element.cmd.indexOf(" Limit(") != -1) {
			const max = parseInt(element.cmd.split(" Limit(")[1].split(")")[0].trim());
			if (obj.length > max) {
				let parentName = undefined;
				if (parentElement.cmd[0] == "@") {
					parentName = parentElement.cmd.split("->")[0].trim().split("@")[1];
				} else {
					let pr = t.tree[element.parent];
					while (pr.cmd[0] != "@" && pr.parent > 0) {
						pr = pr.cmd;
					}
					parentName = pr.cmd.split("->")[0].trim().split("@")[1];
				}
				const errmsg = "The number of the elements exceed the size: " + max;
				const errObj = { type: "Size.Limit", element: parentName, code: 0, path: element.path, message: errmsg };
				element.errors.push(errObj);
			}
		} 
		if (element.cmd.indexOf(" Count(") != -1) {
			const max = parseInt(element.cmd.split(" Count(")[1].split(")")[0].trim());
			if (obj.length != max) {
				let parentName = undefined;
				if (parentElement.cmd[0] == "@") {
					parentName = parentElement.cmd.split("->")[0].trim().split("@")[1];
				} else {
					let pr = t.tree[element.parent];
					while (pr.cmd[0] != "@" && pr.parent > 0) {
						pr = pr.cmd;
					}
					parentName = pr.cmd.split("->")[0].trim().split("@")[1];
				}
				const errmsg = "The number of the elements is not the specified size: " + max;
				const errObj = { type: "Size.Count", element: parentName, code: 0, path: element.path, message: errmsg };
				element.errors.push(errObj);
			}
		}
		if (element.cmd.indexOf(" IntArray") != -1) {
			obj.forEach((q) => {
				if (! t.isInt(q)) {
					let parentName = undefined;
					if (parentElement.cmd[0] == "@") {
						parentName = parentElement.cmd.split("->")[0].trim().split("@")[1];
					} else {
						let pr = t.tree[element.parent];
						while (pr.cmd[0] != "@" && pr.parent > 0) {
							pr = pr.cmd;
						}
						parentName = pr.cmd.split("->")[0].trim().split("@")[1];
					}
					const errmsg = "The array must be an array with integer values";
					const errObj = { type: "IntArray", element: parentName, value: q.toString(), code: 0, path: element.path, message: errmsg }; 
					element.errors.push(errObj);
		
				}
			});
		} else if (element.cmd.indexOf(" ObjArray") != -1) {
			obj.forEach((q) => {
				if (! t.isObject(q)) {
					let parentName = undefined;
					if (parentElement.cmd[0] == "@") {
						parentName = parentElement.cmd.split("->")[0].trim().split("@")[1];
					} else {
						let pr = t.tree[element.parent];
						while (pr.cmd[0] != "@" && pr.parent > 0) {
							pr = pr.cmd;
						}
						parentName = pr.cmd.split("->")[0].trim().split("@")[1];
					}
					const errmsg = "The array must be an array with objects";
					const errObj = { type: "ObjArray", element: parentName, value: q.toString(), code: 0, path: element.path, message: errmsg }; 
					element.errors.push(errObj);
		
				}
			});
		} else if (element.cmd.indexOf(" FloatArray") != -1) {
			obj.forEach((q) => {
				if (! t.isFloat(q)) {
					let parentName = undefined;
					if (parentElement.cmd[0] == "@") {
						parentName = parentElement.cmd.split("->")[0].trim().split("@")[1];
					} else {
						let pr = t.tree[element.parent];
						while (pr.cmd[0] != "@" && pr.parent > 0) {
							pr = pr.cmd;
						}
						parentName = pr.cmd.split("->")[0].trim().split("@")[1];
					}
					const errmsg = "The array must be an array with float values";
					const errObj = { type: "FloatArray", element: parentName, value: q.toString(), code: 0, path: element.path, message: errmsg }; 
					element.errors.push(errObj);
					return;
				}
			});
		} else if (element.cmd.indexOf(" StringArray") != -1) {
			obj.forEach((q) => {
				if (! t.isString(q)) {
					let parentName = undefined;
					if (parentElement.cmd[0] == "@") {
						parentName = parentElement.cmd.split("->")[0].trim().split("@")[1];
					} else {
						let pr = t.tree[element.parent];
						while (pr.cmd[0] != "@" && pr.parent > 0) {
							pr = pr.cmd;
						}
						parentName = pr.cmd.split("->")[0].trim().split("@")[1];
					}
					const errmsg = "The array must be an array with string values";
					const errObj = { type: "StringArray", element: parentName, value: q.toString(), code: 0, path: element.path, message: errmsg }; 
					element.errors.push(errObj);
					return;
				}
			});
		} else if (element.cmd.indexOf(" BoolArray") != -1) {
			obj.forEach((q) => {
				if (! t.isBool(q)) {
					let parentName = undefined;
					if (parentElement.cmd[0] == "@") {
						parentName = parentElement.cmd.split("->")[0].trim().split("@")[1];
					} else {
						let pr = t.tree[element.parent];
						while (pr.cmd[0] != "@" && pr.parent > 0) {
							pr = pr.cmd;
						}
						parentName = pr.cmd.split("->")[0].trim().split("@")[1];
					}
					const errmsg = "The array must be an array with string values";
					const errObj = { type: "BoolArray", element: parentName, value: q.toString(), code: 0, path: element.path, message: errmsg }; 
					element.errors.push(errObj);
					return;
				}
			});
		} else if (element.cmd.indexOf(" Types(") != -1) {
			const types = element.cmd.split(" Types(")[1].trim().split(")")[0].trim().split(",");

			const q = obj;
			for (let n = 0; n < types.length; ++n) {

				switch (types[n].trim()) {
					case "Int":
						if (! t.isInt(q[n])) {
							let parentName = undefined;
							if (parentElement.cmd[0] == "@") {
								parentName = parentElement.cmd.split("->")[0].trim().split("@")[1];
							} else {
								let pr = element.parent;
								
								while (t.tree[pr].cmd[0] != "@" && t.tree[pr].parent > 0) {
									pr = t.tree[pr].parent;
								}
								parentName = t.tree[pr].cmd.split("->")[0].trim().split("@")[1];
							}
							const errmsg = "The array must contain an integer value at index " + n;
							const errObj = { type: "ArrayElement.Int", element: parentName, arrayIndex: n, value: q[n].toString(), code: 0, path: element.path, message: errmsg }; 
							element.errors.push(errObj);
						}
						break;
					case "Float":
						if (! t.isFloat(q[n])) {
							let parentName = undefined;
							if (parentElement.cmd[0] == "@") {
								parentName = parentElement.cmd.split("->")[0].trim().split("@")[1];
							} else {
								let pr = element.parent;
								
								while (t.tree[pr].cmd[0] != "@" && t.tree[pr].parent > 0) {
									pr = t.tree[pr].parent;
								}
								parentName = t.tree[pr].cmd.split("->")[0].trim().split("@")[1];
							}
							const errmsg = "The array must contain an float value at index " + n;
							const errObj = { type: "ArrayElement.Float", element: parentName, arrayIndex: n, value: q[n].toString(), code: 0, path: element.path, message: errmsg }; 
							element.errors.push(errObj);
						}
						break;
					case "Object":
					case "Obj":
							if (! t.isObject(q[n])) {
								let parentName = undefined;
								if (parentElement.cmd[0] == "@") {
									parentName = parentElement.cmd.split("->")[0].trim().split("@")[1];
								} else {
									let pr = element.parent;
									
									while (t.tree[pr].cmd[0] != "@" && t.tree[pr].parent > 0) {
										pr = t.tree[pr].parent;
									}
									parentName = t.tree[pr].cmd.split("->")[0].trim().split("@")[1];
								}
								const errmsg = "The array must contain an object at index " + n;
								const errObj = { type: "ArrayElement.Object", element: parentName, arrayIndex: n, value: q[n].toString(), code: 0, path: element.path, message: errmsg }; 
								element.errors.push(errObj);
							}
							break;
					case "String":
						if (! t.isString(q[n])) {
							let parentName = undefined;
							if (parentElement.cmd[0] == "@") {
								parentName = parentElement.cmd.split("->")[0].trim().split("@")[1];
							} else {
								let pr = element.parent;
								
								while (t.tree[pr].cmd[0] != "@" && t.tree[pr].parent > 0) {
									pr = t.tree[pr].parent;
								}
								parentName = t.tree[pr].cmd.split("->")[0].trim().split("@")[1];
							}
							const errmsg = "The array must contain a string value at index " + n;
							const errObj = { type: "ArrayElement.String", element: parentName, arrayIndex: n, value: q.toString(), code: 0, path: element.path, message: errmsg }; 
							element.errors.push(errObj);
						}
						break;
					case "Bool":
						if (! t.isBool(q[n])) {
							let parentName = undefined;
							if (parentElement.cmd[0] == "@") {
								parentName = parentElement.cmd.split("->")[0].trim().split("@")[1];
							} else {
								let pr = element.parent;
								
								while (t.tree[pr].cmd[0] != "@" && t.tree[pr].parent > 0) {
									pr = t.tree[pr].parent;
								}
								parentName = t.tree[pr].cmd.split("->")[0].trim().split("@")[1];
							}
							const errmsg = "The array must contain a boolean at index " + n;
							const errObj = { type: "ArrayElement.Bool", element: parentName, arrayIndex: n, value: q[n].toString(), code: 0, path: element.path, message: errmsg }; 
							element.errors.push(errObj);
						}
						break;
				}
			}
		}

	}

	createResult() {
		const t = this;
		if (t.result != undefined) {
			return t.result;
		}
		const errobjs = [];
		t.tree.forEach((q) => {
			q.errors.forEach((r) => {
				errobjs.push(r);
			});
		});
		if (errobjs.length > 0) {
			t.result = { ok: false, numberOfErrors: errobjs.length, errors: errobjs };
		} else {
			t.result = { ok: true };
		}
		/* free other objects */
		t.tree = undefined;
		t.template = undefined;
		t.imports = {};
		return t.result;
	}

	isObject(q) {
		return typeof q === 'object' && !Array.isArray(q) && q !== null;
	}

	isArray(q) {
		return Array.isArray(q) && q !== null;
	}

	isInt(q) {
		return !isNaN(q) && parseInt(Number(q)) == q && !isNaN(parseInt(q, 10));
	}

	isFloat(q) {
		return parseFloat(q) === q || parseInt(q) === q;
	}

	isBool(q) {
		if (typeof q == "boolean") {
			if (q === true || q === false) {
				return true;
			}
		}
		return false;
	}

	isString(q) {
		return (typeof q === 'string' || q instanceof String);
	}
}
exports.Sonars = Sonars;
exports.validate = (obj, template) => {
	return new Sonars(obj, template).check();
}
