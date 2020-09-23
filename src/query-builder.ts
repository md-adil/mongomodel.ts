import Model, { ModelConstructor } from "./model";

export default class QueryBuilder<M extends Model<P>, P> {
    private _query: Record<string, string | number> = {};
  
    private _limit?: number;
  
    private _skip?: number;
  
    private _selector?: Record<string, number>;
  
    static paginateSize = 25;
  
    // eslint-disable-next-line no-shadow
    constructor(public Model: ModelConstructor<P, M>) {
    }
  
    async find(limit?: number, skip?: number) {
        limit = limit || this._limit;
        skip = skip || this._skip;
        console.log(this.Model.collection);
        const querybuilder = this.Model.getCollection().find(this._query as any, this._selector);
        if (limit) {
            querybuilder.limit(limit);
        }
        if (skip) {
            querybuilder.skip(skip);
        }
        const rows: M[] = [];
        for await (const row of querybuilder) {
            rows.push(new this.Model(row));
        }
        return rows;
    }
  
    async* cursor() {
        for await (const row of (this.Model as any).model.find(this._query, this._selector).skip(this._skip).limit(this._limit).lean()
            .cursor()) {
            yield new this.Model(row as P);
        }
    }
  
    take(n: number) {
        this._limit = n;
        return this;
    }
  
    skip(n: number) {
        this._skip = n;
    }
  
    where(name: string, value: any) {
        this._query[name] = value;
        return this;
    }
  
    select(...fields: (string | Record<string, number>)[]) {
        if (!this._selector) {
            this._selector = {};
        }
        for (const field of fields) {
            if (typeof field === "string") {
                this._selector[field] = 1;
            } else {
                Object.assign(this._selector, field);
            }
        }
        return this;
    }
  
    clone() {
        const cloned = new QueryBuilder(this.Model);
        Object.keys(this).forEach((key) => {
            // cloned[key] = this[key];
        });
        return cloned;
    }
  
    async create(props: P) {
        const observer = this.Model.observer;
        const record = new this.Model(props);
        if (observer && observer.creating) {
            await observer.creating(record);
        }
        await record.save();
        if (observer && observer.created) {
            observer.created(record);
        }
    }
  
    delete() {
  
    }
  
    async paginate(page: number, limit: number = QueryBuilder.paginateSize) {
        const total = await (this.Model as any).model.countDocuments(this._query);
        const docs = await this.find(limit, (page - 1) * limit);
        const pages = Math.ceil(total / limit);
        return {
            limit,
            page,
            pages,
            total,
            docs,
        };
    }
  }