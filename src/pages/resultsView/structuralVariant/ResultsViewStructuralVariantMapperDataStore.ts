/*
 * Copyright (c) 2018 The Hyve B.V.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as _ from 'lodash';
import { computed, makeObservable } from 'mobx';
import { SimpleLazyMobXTableApplicationDataStore } from 'shared/lib/ILazyMobXTableApplicationDataStore';
import { StructuralVariant } from 'cbioportal-ts-api-client';

export default class ResultsViewStructuralVariantMapperDataStore extends SimpleLazyMobXTableApplicationDataStore<
    StructuralVariant[]
> {
    constructor(
        data: StructuralVariant[][],
        private readonly queriedGeneSymbol: string
    ) {
        super(data);
        makeObservable(this);
    }

    @computed
    get duplicateStructuralVariantCountInMultipleSamples(): number {
        const countMapper = (structuralVariants: StructuralVariant[]) =>
            structuralVariants.length > 0 ? structuralVariants.length - 1 : 0;

        const sumReducer = (acc: number, current: number) => acc + current;

        return _.chain(this.tableData)
            .flatten()
            .groupBy(structuralVariant => {
                return `${structuralVariant.patientId}_${structuralVariant.site1Chromosome}_${structuralVariant.site1Position}_${structuralVariant.site2Chromosome}_${structuralVariant.site2Position}`;
            })
            .map(countMapper)
            .reduce(sumReducer, 0)
            .value();
    }

    @computed
    get genePartnerCounts(): { [partner: string]: number } {
        const counts: { [partner: string]: number } = {};
        const queriedGene = this.queriedGeneSymbol.toUpperCase();

        _.flatten(this.tableData).forEach(structuralVariant => {
            const site1Gene = structuralVariant.site1HugoSymbol;
            const site2Gene = structuralVariant.site2HugoSymbol;

            if (!site1Gene || !site2Gene) {
                return;
            }

            const normalizedSite1 = site1Gene.toUpperCase();
            const normalizedSite2 = site2Gene.toUpperCase();

            if (
                normalizedSite1 === queriedGene &&
                normalizedSite2 !== queriedGene
            ) {
                counts[normalizedSite2] = (counts[normalizedSite2] || 0) + 1;
            } else if (
                normalizedSite2 === queriedGene &&
                normalizedSite1 !== queriedGene
            ) {
                counts[normalizedSite1] = (counts[normalizedSite1] || 0) + 1;
            }
        });

        return counts;
    }
}
