const s = require("./sonars/parselib.js");

const testTemplate =
`{
    @employees -> _ Required
        [ OneOrMore Limit(50)
            {
                @name -> e Required String
                    #Import 'names' -> names
                    #Set {e = e.trim()}
                    #Const {MIN = 4}
                    #Const {MAX = 50}
                    #Const {EXTRA = ['/','*',';',':','+','!','?']}
                    -> {e.length <= MAX && e.length >= MIN} -> (101) -> "The size of the name must be $MIN: - $MAX:"
                    -> {names.isPrintable(e)} -> (102) -> "The name must contain printable chars only"
                    -> {names.notContains(e, EXTRA)} -> (103) -> "The name can't contains special chars"
                    -> {names.contains(e, [' '])} -> (104) -> "The name must contains first name & surname"
                @birthday -> d Required String
                    #Import 'dates' -> dates
                    #Set {d = d.trim()}
                    #Const {MIN = 1900}
                    #Const {MAX = dates.currentYear(-14)}
                    #Watch {y = dates.yearOf(d)}
                    -> {dates.isRealDate(d)} -> (201) -> "The given string is not a date format or a real date"
                    -> {y >= MIN && y <= MAX} -> (202) -> "The year must be between $MIN: and $MAX:"
                @grossSalary -> q Required Int
                    -> {q >= 0} -> (301) -> "The gross salary can't be zero or negative"
                    -> {q < 99999999} -> (302) -> "The gross salary exceed the limit"
`;

let testObj = {
    employees: [
        {name: "John Smith",  }
        , { birthday: "2001-03-03" }
    ]
};
result = s.validate(testObj, testTemplate);
console.log("-=: Required elements :=-");
console.log("Request: \n"+ JSON.stringify(testObj,null,2));
console.log("Response: \n"+ JSON.stringify(result,null,2) + "\n\n");


testObj = {
    employees: [
        {name: "Joe", grossSalary: -45563, birthday: "2021-07-07" }
        , {name: "Jack Lee", grossSalary: 85943, birthday: "202-03-03" }
    ]
};
result = s.validate(testObj, testTemplate);
console.log("-=: Required elements :=-");
console.log("Request: \n"+ JSON.stringify(testObj,null,2));
console.log("Response: \n"+ JSON.stringify(result,null,2) + "\n\n");


testObj = {
    employees: []
};
result = s.validate(testObj, testTemplate);
console.log("-=: One or more array length :=-");
console.log("Request: \n"+ JSON.stringify(testObj,null,2));
console.log("Response: \n"+ JSON.stringify(result,null,2) + "\n\n");


testObj = {
    employees: [
        { name: 775.0, grossSalary: "No good salary", birthday: 1234 }
    ]
};
result = s.validate(testObj, testTemplate);
console.log("-=: Type errors :=-");
console.log("Request: \n"+ JSON.stringify(testObj,null,2));
console.log("Response: \n"+ JSON.stringify(result,null,2) + "\n\n");


const testTemplate2 =
`{
    @rows -> _ Required
        [
            [ Types(Int,String,Int,Bool) Count(4)
    @fields -> _
        [ StringArray Count(4)
`

testObj = {
    rows: [ 
        [1, "Admin", "f99ab87c66df45", true],
        [2, "Guest", "a8f5423d9c8ffa", true]
    ]
    , fields: [ "Id", "Name", "Password", "Active" ]
};
result = s.validate(testObj, testTemplate2);
console.log("-=: Array types :=-");
console.log("Request: \n"+ JSON.stringify(testObj,null,2));
console.log("Response: \n"+ JSON.stringify(result,null,2) + "\n\n");



testObj = {
    employees: [
        { name: "Test Joe", grossSalary: 600000, birthday: "1980-03-03" }
    ]
};
result = s.validate(testObj, testTemplate);
console.log("-=: Everything is correct :=-");
console.log("Request: \n"+ JSON.stringify(testObj,null,2));
console.log("Response: \n"+ JSON.stringify(result,null,2) + "\n\n");
