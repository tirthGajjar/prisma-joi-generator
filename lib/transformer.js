"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const writeFileSafely_1 = require("./utils/writeFileSafely");
class Transformer {
    constructor({ name, fields, modelOperations, enumTypes, }) {
        this.name = name !== null && name !== void 0 ? name : '';
        this.fields = fields !== null && fields !== void 0 ? fields : [];
        this.modelOperations = modelOperations !== null && modelOperations !== void 0 ? modelOperations : [];
        this.schemaImports = new Set();
        this.enumTypes = enumTypes;
    }
    static setOutputPath(outPath) {
        this.outputPath = outPath;
    }
    static getOutputPath() {
        return this.outputPath;
    }
    addSchemaImport(name) {
        var _a;
        (_a = this.schemaImports) === null || _a === void 0 ? void 0 : _a.add(name);
    }
    getAllSchemaImports() {
        var _a;
        return [...((_a = this.schemaImports) !== null && _a !== void 0 ? _a : [])]
            .map((name) => Transformer.enumNames.includes(name)
            ? `import { ${name}Schema } from '../enums/${name}.schema'`
            : `import { ${name}SchemaObject } from './${name}.schema'`)
            .join(';\r\n');
    }
    getPrismaStringLine(field, inputType, inputsLength) {
        if (inputsLength === 1) {
            if (inputType.isList) {
                if (inputType.type === this.name) {
                    return `  ${field.name}: Joi.array().items(${`Joi.link('#${inputType.type}')`})`;
                }
                else {
                    return `  ${field.name}: ${Transformer.enumNames.includes(inputType.type)
                        ? `${`${inputType.type}Schema`}`
                        : `Joi.array().items(Joi.object().keys(${`${inputType.type}SchemaObject`}))`}`;
                }
            }
            else {
                if (inputType.type === this.name) {
                    return `  ${field.name}: ${`Joi.link('#${inputType.type}')`}`;
                }
                else {
                    return `  ${field.name}: ${Transformer.enumNames.includes(inputType.type)
                        ? `${`${inputType.type}Schema`}`
                        : `Joi.object().keys(${`${inputType.type}SchemaObject`})`}`;
                }
            }
        }
        if (inputsLength > 1) {
            if (inputType.isList) {
                if (inputType.type === this.name) {
                    return `Joi.array().items(${`Joi.link('#${inputType.type}')`})`;
                }
                else {
                    return `${Transformer.enumNames.includes(inputType.type)
                        ? `${`${inputType.type}Schema`}`
                        : `Joi.array().items(Joi.object().keys(${`${inputType.type}SchemaObject`}))`}`;
                }
            }
            else {
                if (inputType.type === this.name) {
                    return `${`Joi.link('#${inputType.type}')`}`;
                }
                else {
                    return `${Transformer.enumNames.includes(inputType.type)
                        ? `${`${inputType.type}Schema`}`
                        : `Joi.object().keys(${`${inputType.type}SchemaObject`})`}`;
                }
            }
        }
        return '';
    }
    getSchemaObjectLine(field) {
        let lines = field.inputTypes;
        const inputsLength = field.inputTypes.length;
        if (inputsLength === 0)
            return lines;
        if (inputsLength === 1) {
            lines = lines.map((inputType) => {
                if (inputType.type === 'String') {
                    return [
                        `  ${field.name}: ${inputType.isList
                            ? 'Joi.array().items(Joi.string())'
                            : 'Joi.string()'}`,
                        field,
                    ];
                }
                else if (inputType.type === 'Int' || inputType.type === 'Float') {
                    return [
                        `  ${field.name}: ${inputType.isList
                            ? 'Joi.array().items(Joi.number())'
                            : 'Joi.number()'}`,
                        field,
                    ];
                }
                else if (inputType.type === 'Boolean') {
                    return [
                        `  ${field.name}: ${inputType.isList
                            ? 'Joi.array().items(Joi.boolean())'
                            : 'Joi.boolean()'}`,
                        field,
                    ];
                }
                else if (inputType.type === 'DateTime') {
                    return [
                        `  ${field.name}: ${inputType.isList ? 'Joi.array().items(Joi.date())' : 'Joi.date()'}`,
                        field,
                    ];
                }
                else {
                    if (inputType.namespace === 'prisma') {
                        if (inputType.type !== this.name) {
                            this.addSchemaImport(inputType.type);
                        }
                        return [
                            this.getPrismaStringLine(field, inputType, inputsLength),
                            field,
                            true,
                        ];
                    }
                }
                return [];
            });
        }
        else {
            const alternatives = lines.reduce((result, inputType) => {
                if (inputType.type === 'String') {
                    result.push(inputType.isList
                        ? 'Joi.array().items(Joi.string())'
                        : 'Joi.string()');
                }
                else if (inputType.type === 'Int' || inputType.type === 'Float') {
                    result.push(inputType.isList
                        ? 'Joi.array().items(Joi.number())'
                        : 'Joi.number()');
                }
                else if (inputType.type === 'Boolean') {
                    result.push(inputType.isList
                        ? 'Joi.array().items(Joi.boolean())'
                        : 'Joi.boolean()');
                }
                else {
                    if (inputType.namespace === 'prisma') {
                        if (inputType.type !== this.name) {
                            this.addSchemaImport(inputType.type);
                        }
                        result.push(this.getPrismaStringLine(field, inputType, inputsLength));
                    }
                    else if (inputType.type === 'Json') {
                        result.push(inputType.isList ? 'Joi.array().items(Joi.any())' : 'Joi.any()');
                    }
                }
                return result;
            }, []);
            if (alternatives.length > 0) {
                lines = [
                    [
                        `  ${field.name}: Joi.alternatives().try(${alternatives.join(',\r\n')})`,
                        field,
                        true,
                    ],
                ];
            }
            else {
                return [[]];
            }
        }
        return lines.filter(Boolean);
    }
    getFieldValidators(joiStringWithMainType, field) {
        let joiStringWithAllValidators = joiStringWithMainType;
        const { isRequired, isNullable } = field;
        if (isRequired) {
            joiStringWithAllValidators += '.required()';
        }
        if (isNullable) {
            joiStringWithAllValidators += '.allow(null)';
        }
        return joiStringWithAllValidators;
    }
    wrapWithObject({ joiStringFields, isArray = true, forData = false, }) {
        let wrapped = '{';
        wrapped += '\n';
        wrapped += isArray
            ? '  ' + joiStringFields.join(',\r\n')
            : '  ' + joiStringFields;
        wrapped += '\n';
        wrapped += forData ? '  ' + '}' : '}';
        return wrapped;
    }
    getImportJoi() {
        let joiImportStatement = "import Joi from 'joi';";
        joiImportStatement += '\n';
        return joiImportStatement;
    }
    getImportsForSchemaObjects() {
        let imports = this.getImportJoi();
        imports += this.getAllSchemaImports();
        imports += '\n\n';
        return imports;
    }
    getImportsForSchemas(additionalImports) {
        let imports = this.getImportJoi();
        imports += [...additionalImports].join(';\r\n');
        imports += '\n\n';
        return imports;
    }
    addExportSchemaObject(schema) {
        return `export const ${this.name}SchemaObject = ${schema}`;
    }
    addExportSchema(schema, name) {
        return `export const ${name}Schema = ${schema}`;
    }
    getImportNoCheck() {
        let imports = '// @ts-nocheck';
        imports += '\n';
        return imports;
    }
    getFinalForm(joiStringFields) {
        return `${this.getImportNoCheck()}${this.getImportsForSchemaObjects()}${this.addExportSchemaObject(this.wrapWithObject({ joiStringFields }))}`;
    }
    async printSchemaObjects() {
        var _a;
        const joiStringFields = ((_a = this.fields) !== null && _a !== void 0 ? _a : [])
            .map((field) => {
            const value = this.getSchemaObjectLine(field);
            return value;
        })
            .flatMap((item) => item)
            .filter((item) => item && item.length > 0)
            .map((item) => {
            const [joiStringWithMainType, field, skipValidators] = item;
            const value = this.getFieldValidators(joiStringWithMainType, field);
            return value;
        });
        await (0, writeFileSafely_1.writeFileSafely)(path_1.default.join(Transformer.outputPath, `schemas/objects/${this.name}.schema.ts`), this.getFinalForm(joiStringFields));
        Transformer.generatedSchemaObjectFiles.push(`./${this.name}.schema`);
    }
    async printModelSchemas() {
        var _a;
        for (const model of (_a = this.modelOperations) !== null && _a !== void 0 ? _a : []) {
            const { model: modelName, findUnique, findFirst, findMany, 
            // @ts-ignore
            createOne, 
            // @ts-ignore
            deleteOne, 
            // @ts-ignore
            updateOne, deleteMany, updateMany, 
            // @ts-ignore
            upsertOne, aggregate, groupBy, } = model;
            if (findUnique) {
                const imports = [
                    `import { ${modelName}WhereUniqueInputSchemaObject } from './objects'`,
                ];
                await (0, writeFileSafely_1.writeFileSafely)(path_1.default.join(Transformer.outputPath, `schemas/${findUnique}.schema.ts`), `${this.getImportsForSchemas(imports)}${this.addExportSchema(`Joi.object().keys({ where: Joi.object().keys(${modelName}WhereUniqueInputSchemaObject) }).required()`, `${modelName}FindUnique`)}`);
                Transformer.generatedSchemaFiles.push(`./${findUnique}.schema`);
            }
            if (findFirst) {
                const imports = [
                    `import { ${modelName}WhereInputSchemaObject, ${modelName}OrderByWithRelationInputSchemaObject, ${modelName}WhereUniqueInputSchemaObject } from './objects'`,
                    `import { ${modelName}ScalarFieldEnumSchema } from './enums'`,
                ];
                await (0, writeFileSafely_1.writeFileSafely)(path_1.default.join(Transformer.outputPath, `schemas/${findFirst}.schema.ts`), `${this.getImportsForSchemas(imports)}${this.addExportSchema(`Joi.object().keys({ where: Joi.object().keys(${modelName}WhereInputSchemaObject), orderBy: Joi.object().keys(${modelName}OrderByWithRelationInputSchemaObject), cursor: Joi.object().keys(${modelName}WhereUniqueInputSchemaObject), take: Joi.number(), skip: Joi.number(), distinct: Joi.array().items(${modelName}ScalarFieldEnumSchema) }).required()`, `${modelName}FindFirst`)}`);
                Transformer.generatedSchemaFiles.push(`./${findFirst}.schema`);
            }
            if (findMany) {
                const imports = [
                    `import { ${modelName}WhereInputSchemaObject, ${modelName}OrderByWithRelationInputSchemaObject, ${modelName}WhereUniqueInputSchemaObject } from './objects'`,
                    `import { ${modelName}ScalarFieldEnumSchema } from './enums'`,
                ];
                await (0, writeFileSafely_1.writeFileSafely)(path_1.default.join(Transformer.outputPath, `schemas/${findMany}.schema.ts`), `${this.getImportsForSchemas(imports)}${this.addExportSchema(`Joi.object().keys({ where: Joi.object().keys(${modelName}WhereInputSchemaObject), orderBy: Joi.object().keys(${modelName}OrderByWithRelationInputSchemaObject), cursor: Joi.object().keys(${modelName}WhereUniqueInputSchemaObject), take: Joi.number(), skip: Joi.number(), distinct: Joi.array().items(${modelName}ScalarFieldEnumSchema)  }).required()`, `${modelName}FindMany`)}`);
                Transformer.generatedSchemaFiles.push(`./${findMany}.schema`);
            }
            if (createOne) {
                const imports = [
                    `import { ${modelName}CreateInputSchemaObject } from './objects'`,
                ];
                await (0, writeFileSafely_1.writeFileSafely)(path_1.default.join(Transformer.outputPath, `schemas/${createOne}.schema.ts`), `${this.getImportsForSchemas(imports)}${this.addExportSchema(`Joi.object().keys({ data: Joi.object().keys(${modelName}CreateInputSchemaObject)  }).required()`, `${modelName}Create`)}`);
                Transformer.generatedSchemaFiles.push(`./${createOne}.schema`);
            }
            if (deleteOne) {
                const imports = [
                    `import { ${modelName}WhereUniqueInputSchemaObject } from './objects'`,
                ];
                await (0, writeFileSafely_1.writeFileSafely)(path_1.default.join(Transformer.outputPath, `schemas/${deleteOne}.schema.ts`), `${this.getImportsForSchemas(imports)}${this.addExportSchema(`Joi.object().keys({ where: Joi.object().keys(${modelName}WhereUniqueInputSchemaObject)  }).required()`, `${modelName}DeleteOne`)}`);
                Transformer.generatedSchemaFiles.push(`./${deleteOne}.schema`);
            }
            if (deleteMany) {
                const imports = [
                    `import { ${modelName}WhereInputSchemaObject } from './objects'`,
                ];
                await (0, writeFileSafely_1.writeFileSafely)(path_1.default.join(Transformer.outputPath, `schemas/${deleteMany}.schema.ts`), `${this.getImportsForSchemas(imports)}${this.addExportSchema(`Joi.object().keys({ where: Joi.object().keys(${modelName}WhereInputSchemaObject)  }).required()`, `${modelName}DeleteMany`)}`);
                Transformer.generatedSchemaFiles.push(`./${deleteMany}.schema`);
            }
            if (updateOne) {
                const imports = [
                    `import { ${modelName}UpdateInputSchemaObject, ${modelName}WhereUniqueInputSchemaObject } from './objects'`,
                ];
                await (0, writeFileSafely_1.writeFileSafely)(path_1.default.join(Transformer.outputPath, `schemas/${updateOne}.schema.ts`), `${this.getImportsForSchemas(imports)}${this.addExportSchema(`Joi.object().keys({ data: Joi.object().keys(${modelName}UpdateInputSchemaObject), where: Joi.object().keys(${modelName}WhereUniqueInputSchemaObject)  }).required()`, `${modelName}UpdateOne`)}`);
                Transformer.generatedSchemaFiles.push(`./${updateOne}.schema`);
            }
            if (updateMany) {
                const imports = [
                    `import { ${modelName}UpdateManyMutationInputSchemaObject, ${modelName}WhereInputSchemaObject } from './objects'`,
                ];
                await (0, writeFileSafely_1.writeFileSafely)(path_1.default.join(Transformer.outputPath, `schemas/${updateMany}.schema.ts`), `${this.getImportsForSchemas(imports)}${this.addExportSchema(`Joi.object().keys({ data: Joi.object().keys(${modelName}UpdateManyMutationInputSchemaObject), where: Joi.object().keys(${modelName}WhereInputSchemaObject)  }).required()`, `${modelName}UpdateMany`)}`);
                Transformer.generatedSchemaFiles.push(`./${updateMany}.schema`);
            }
            if (upsertOne) {
                const imports = [
                    `import { ${modelName}WhereUniqueInputSchemaObject, ${modelName}CreateInputSchemaObject, ${modelName}UpdateInputSchemaObject } from './objects'`,
                ];
                await (0, writeFileSafely_1.writeFileSafely)(path_1.default.join(Transformer.outputPath, `schemas/${upsertOne}.schema.ts`), `${this.getImportsForSchemas(imports)}${this.addExportSchema(`Joi.object().keys({ where: Joi.object().keys(${modelName}WhereUniqueInputSchemaObject), data: Joi.object().keys(${modelName}CreateInputSchemaObject), update: Joi.object().keys(${modelName}UpdateInputSchemaObject)  }).required()`, `${modelName}Upsert`)}`);
                Transformer.generatedSchemaFiles.push(`./${upsertOne}.schema`);
            }
            if (aggregate) {
                const imports = [
                    `import { ${modelName}WhereInputSchemaObject, ${modelName}OrderByWithRelationInputSchemaObject, ${modelName}WhereUniqueInputSchemaObject } from './objects'`,
                ];
                await (0, writeFileSafely_1.writeFileSafely)(path_1.default.join(Transformer.outputPath, `schemas/${aggregate}.schema.ts`), `${this.getImportsForSchemas(imports)}${this.addExportSchema(`Joi.object().keys({ where: Joi.object().keys(${modelName}WhereInputSchemaObject), orderBy: Joi.object().keys(${modelName}OrderByWithRelationInputSchemaObject), cursor: Joi.object().keys(${modelName}WhereUniqueInputSchemaObject), take: Joi.number(), skip: Joi.number()  }).required()`, `${modelName}Aggregate`)}`);
                Transformer.generatedSchemaFiles.push(`./${aggregate}.schema`);
            }
            if (groupBy) {
                const imports = [
                    `import { ${modelName}WhereInputSchemaObject, ${modelName}OrderByWithAggregationInputSchemaObject, ${modelName}ScalarWhereWithAggregatesInputSchemaObject } from './objects'`,
                    `import { ${modelName}ScalarFieldEnumSchema } from './enums'`,
                ];
                await (0, writeFileSafely_1.writeFileSafely)(path_1.default.join(Transformer.outputPath, `schemas/${groupBy}.schema.ts`), `${this.getImportsForSchemas(imports)}${this.addExportSchema(`Joi.object().keys({ where: Joi.object().keys(${modelName}WhereInputSchemaObject), orderBy: Joi.object().keys(${modelName}OrderByWithAggregationInputSchemaObject), having: Joi.object().keys(${modelName}ScalarWhereWithAggregatesInputSchemaObject), take: Joi.number(), skip: Joi.number(), by: Joi.array().items(${modelName}ScalarFieldEnumSchema).required()  }).required()`, `${modelName}GroupBy`)}`);
                Transformer.generatedSchemaFiles.push(`./${groupBy}.schema`);
            }
        }
    }
    async printIndex(type) {
        const filesPaths = type === 'SCHEMAS'
            ? Transformer.generatedSchemaFiles
            : type === 'SCHEMA_ENUMS'
                ? Transformer.generatedSchemaEnumFiles
                : Transformer.generatedSchemaObjectFiles;
        const exports = filesPaths.map((schemaPath) => `export * from '${schemaPath}';`);
        const outputPath = path_1.default.join(Transformer.outputPath, type === 'SCHEMAS'
            ? `schemas/index.ts`
            : type === 'SCHEMA_ENUMS'
                ? `schemas/enums/index.ts`
                : `schemas/objects/index.ts`);
        await (0, writeFileSafely_1.writeFileSafely)(outputPath, `${exports.join('\r\n')}`);
    }
    async printEnumSchemas() {
        var _a;
        for (const enumType of (_a = this.enumTypes) !== null && _a !== void 0 ? _a : []) {
            const { name, values } = enumType;
            await (0, writeFileSafely_1.writeFileSafely)(path_1.default.join(Transformer.outputPath, `schemas/enums/${name}.schema.ts`), `${this.getImportJoi()}\n${this.addExportSchema(`Joi.string().valid(...${JSON.stringify(values)})`, `${name}`)}`);
            Transformer.generatedSchemaEnumFiles.push(`./${name}.schema`);
        }
    }
}
exports.default = Transformer;
Transformer.enumNames = [];
Transformer.generatedSchemaFiles = [];
Transformer.generatedSchemaObjectFiles = [];
Transformer.generatedSchemaEnumFiles = [];
//# sourceMappingURL=transformer.js.map