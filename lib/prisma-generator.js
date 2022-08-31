"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate = void 0;
const internals_1 = require("@prisma/internals");
const removeDir_1 = __importDefault(require("./utils/removeDir"));
const fs_1 = require("fs");
const transformer_1 = __importDefault(require("./transformer"));
async function generate(options) {
    var _a, _b, _c;
    const outputDir = (0, internals_1.parseEnvValue)(options.generator.output);
    await fs_1.promises.mkdir(outputDir, { recursive: true });
    await (0, removeDir_1.default)(outputDir, true);
    const prismaClientProvider = options.otherGenerators.find((it) => (0, internals_1.parseEnvValue)(it.provider) === 'prisma-client-js');
    const prismaClientDmmf = await (0, internals_1.getDMMF)({
        datamodel: options.datamodel,
        previewFeatures: prismaClientProvider === null || prismaClientProvider === void 0 ? void 0 : prismaClientProvider.previewFeatures,
    });
    transformer_1.default.setOutputPath(outputDir);
    const enumTypes = [
        ...prismaClientDmmf.schema.enumTypes.prisma,
        ...((_a = prismaClientDmmf.schema.enumTypes.model) !== null && _a !== void 0 ? _a : []),
    ];
    const enumNames = enumTypes.map((enumItem) => enumItem.name);
    transformer_1.default.enumNames = enumNames !== null && enumNames !== void 0 ? enumNames : [];
    const enumsObj = new transformer_1.default({
        enumTypes,
    });
    await enumsObj.printEnumSchemas();
    for (let i = 0; i < prismaClientDmmf.schema.inputObjectTypes.prisma.length; i += 1) {
        const fields = (_b = prismaClientDmmf.schema.inputObjectTypes.prisma[i]) === null || _b === void 0 ? void 0 : _b.fields;
        const name = (_c = prismaClientDmmf.schema.inputObjectTypes.prisma[i]) === null || _c === void 0 ? void 0 : _c.name;
        const obj = new transformer_1.default({ name, fields });
        await obj.printSchemaObjects();
    }
    const obj = new transformer_1.default({
        modelOperations: prismaClientDmmf.mappings.modelOperations,
    });
    await obj.printModelSchemas();
    await obj.printIndex('SCHEMAS');
    await obj.printIndex('SCHEMA_OBJECTS');
    await obj.printIndex('SCHEMA_ENUMS');
}
exports.generate = generate;
//# sourceMappingURL=prisma-generator.js.map