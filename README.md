# Sonar 

## 1.What is this?

This is a small json parser and validator lib that can be used in NodeJs.   
(The 'sonar' is from the letters of jSONpARse.)

## 2.Validation error types?

The validator groups the errors by type:
1. Required: It's fired when there is a missing element.
2. Type: It's fired when there is an incorrect type.
3. Size: It's fired when there is an incorrect array size.
4. Rule: It's fired when the given arbitrary conditions is not satisfied.

## 3.Options

The conditions in the rule policies can be given in vanilla JS language.   
The statements can be these:
* Required
* OneOrMore
* Limit(<number>)
* String
* Int
* Float
* Bool
* #Import
* #Watch #Const #Set
* -> (custom rules)
* [ (arrays)
* { (objects)

## 4.Structure descriptions

We also have to specify the structure, because only this structure will be scanned and will be checked.
We can descript the structure with yaml-like (/ python-like) format.

Object structure:
```
{
    @myVar -> _
        {
            @prop1 -> p
            @prop2 -> p
```

Array structure:
```
{
    @myVar -> _
        [
            {
                @prop1 -> p
                ..
                @prop2 -> p
```

The variables can be indicated by the @ sign, and you must specify an alias name with the '->'.
Further, we can use this alias in the rule policy as a variable, but the using of it wont be mandatory.

## 5.Array policy options

You can use the array policy to give the rules for the array size, or you can specify the mandatory elements.

The 'Required' specification:
```
    {
        @mayVar -> _ Required
```

The 'OneOrMore' and/or 'Limit' specification:
```
    @myVar -> _
        [ OneOrMore Limit(50)
            ...

```

## 6.Type checkings

Types specification:
```
    ...
    @myVar1 -> q Int
    @myVar2 -> q String
    @myVar3 -> q Bool
    @myVar3 -> q Float
    ...
```
If you dont give the type policy, the type could be anything. (Wont be fired the 'Incorrect type' error.)

## 8.Rule policies:

The rule policies start with '->' in the lines, and go on with "{ statement }". After that you must give the error code in parenthesis & the error message separated with '->'.

```
    ...
    @myVar1 -> q Int
        -> { q % 2 == 0 } -> (123) -> "The number must be even"
    ...
```
As we see we have to specify the correct condition and if it fails, the error will be added to the result.

### 8.1.'#Watch', '#Const' and '#Set' descriptors

You can give a calculation or a fix value with the constant name.
```
    ...
    {
        @myString -> s
            #Set { s = s.trim() }
            #Const { MIN = 3 }
            #Const { MAX = 20 }
            #Watch { len = s.length }
            -> { len <= MAX && len >= MIN } -> (101) -> "The size must be $MIN: - $MAX:"
            -> { s.indexOf(' ') !== -1 } -> (102) -> "You must specify a name (first name, surname)"
```
* The '#Watch' is really a local declaration like 'let a = b'
* The '#Const' is a constant declaration like 'const a = b'
* The '#Set' is a changing variable like 'a = b'. It can't be used with constants.


### 8.2.'#Import' statement

In some cases you need more complex condition, or you would like to reuse it. The '#Import' helps you in it.   
With '#Import' you can import functions or constants from a NodeJs source file.

The dates.js contains some useful date function that you can import.
```
exports.isRealDate = (q) => {
    return (new Date(q + 'T12:00:00Z')).toDateString() != 'Invalid Date';
};
exports.currentYear = (q) => {
    return (new Date()).getFullYear() + q;
};
exports.yearOf = (q) => {
    return new Date(q + 'T12:00:00Z').getFullYear();
};
```

The import declaration:
```
    {
        ...
        @birthday -> d Required String
            #Import 'dates' -> dates
            #Const {MIN = 1900}
            #Const {MAX = dates.currentYear(-14)}
            #Watch {y = dates.yearOf(d)}
            -> {dates.isRealDate(d)} -> (201) -> "The given string is not a date format or a real date"
            -> {y >= MIN && y <= MAX} -> (202) -> "The year must be between $MIN: and $MAX:"
```
You can also use the declared values in the errormessage. (e.g.: $YOUR_CONST: )

### Results and tests

The result contains an array with errors (incorrect) or can be an ok (correct) result.


Incorrect result with error.
```
{
  "ok": false,
  "numberOfErrors": 4,
  "errors": [
    {
      "type": "Required",
      "element": "name",
      "code": 0,
      "path": "{@employees[{@name",
      "message": "The 'name' is required"
    },
```

The OK result is simple:
```
{
  "ok": true
}
```

You can test the validator with executing test.js.
```
node test.js
```
