import type { DMMF as PrismaDMMF } from '@prisma/generator-helper';
export default class Transformer {
    name?: string;
    fields?: PrismaDMMF.SchemaArg[];
    schemaImports?: Set<string>;
    modelOperations?: PrismaDMMF.ModelMapping[];
    enumTypes?: PrismaDMMF.SchemaEnum[];
    static enumNames: Array<string>;
    static generatedSchemaFiles: Array<string>;
    static generatedSchemaObjectFiles: Array<string>;
    static generatedSchemaEnumFiles: Array<string>;
    private static outputPath?;
    constructor({ name, fields, modelOperations, enumTypes, }: {
        name?: string | undefined;
        fields?: PrismaDMMF.SchemaArg[] | undefined;
        schemaImports?: Set<string>;
        modelOperations?: PrismaDMMF.ModelMapping[];
        enumTypes?: PrismaDMMF.SchemaEnum[];
    });
    static setOutputPath(outPath: string): void;
    static getOutputPath(): string;
    addSchemaImport(name: string): void;
    getAllSchemaImports(): string;
    getPrismaStringLine(field: PrismaDMMF.SchemaArg, inputType: PrismaDMMF.SchemaArgInputType, inputsLength: number): string;
    getSchemaObjectLine(field: PrismaDMMF.SchemaArg): any;
    getFieldValidators(joiStringWithMainType: string, field: PrismaDMMF.SchemaArg): string;
    wrapWithObject({ joiStringFields, isArray, forData, }: {
        joiStringFields: string;
        isArray?: boolean;
        forData?: boolean;
    }): string;
    getImportJoi(): string;
    getImportsForSchemaObjects(): string;
    getImportsForSchemas(additionalImports: Array<string>): string;
    addExportSchemaObject(schema: string): string;
    addExportSchema(schema: string, name: string): string;
    getImportNoCheck(): string;
    getFinalForm(joiStringFields: string): string;
    printSchemaObjects(): Promise<void>;
    printModelSchemas(): Promise<void>;
    printIndex(type: 'SCHEMAS' | 'SCHEMA_OBJECTS' | 'SCHEMA_ENUMS'): Promise<void>;
    printEnumSchemas(): Promise<void>;
}
