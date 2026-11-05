/*
 * Copyright (c) 2018 The Hyve B.V.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import ResultsViewStructuralVariantTable from './ResultsViewStructuralVariantTable';
import { observer } from 'mobx-react';
import { ResultsViewStructuralVariantMapperStore } from './ResultsViewStructuralVariantMapperStore';
import ResultsViewStructuralVariantMapperDataStore from './ResultsViewStructuralVariantMapperDataStore';
import LoadingIndicator from '../../../shared/components/loadingIndicator/LoadingIndicator';
import { action, computed, makeObservable, observable } from 'mobx';
import {
    getOncoKbIconStyleFromLocalStorage,
    saveOncoKbIconStyleToLocalStorage,
} from 'shared/lib/AnnotationColumnUtils';
import { MakeMobxView } from 'shared/components/MobxView';
import ErrorMessage from 'shared/components/ErrorMessage';

export interface IFusionMapperProps {
    store: ResultsViewStructuralVariantMapperStore;
}

@observer
export default class ResultsViewStructuralVariantMapper extends React.Component<
    IFusionMapperProps,
    {}
> {
    @observable mergeFusionTableOncoKbIcons;
    @observable selectedGenePartner: string | undefined = undefined;

    constructor(props: IFusionMapperProps) {
        super(props);
        makeObservable(this);

        this.mergeFusionTableOncoKbIcons = getOncoKbIconStyleFromLocalStorage().mergeIcons;
    }

    @action.bound
    handleOncoKbIconToggle(mergeIcons: boolean) {
        this.mergeFusionTableOncoKbIcons = mergeIcons;
        saveOncoKbIconStyleToLocalStorage({ mergeIcons });
    }

    @action.bound
    selectGenePartner(partner: string) {
        this.selectedGenePartner =
            this.selectedGenePartner === partner ? undefined : partner;
    }

    @action.bound
    clearGenePartnerFilter() {
        this.selectedGenePartner = undefined;
    }

    @computed
    get displayedDataStore(): ResultsViewStructuralVariantMapperDataStore {
        const { store } = this.props;

        if (!this.selectedGenePartner) {
            return store.dataStore;
        }

        const queriedGene = store.gene.hugoGeneSymbol.toUpperCase();
        const selectedPartner = this.selectedGenePartner.toUpperCase();

        const filteredFusions = store.fusions.filter(fusion => {
            const site1Gene = fusion.site1HugoSymbol?.toUpperCase();
            const site2Gene = fusion.site2HugoSymbol?.toUpperCase();

            return (
                (site1Gene === queriedGene && site2Gene === selectedPartner) ||
                (site2Gene === queriedGene && site1Gene === selectedPartner)
            );
        });

        return new ResultsViewStructuralVariantMapperDataStore(
            filteredFusions.map(fusion => [fusion]),
            store.gene.hugoGeneSymbol
        );
    }

    @computed
    get itemsLabelPlural(): string {
        const count = this.props.store.dataStore
            .duplicateStructuralVariantCountInMultipleSamples;
        const structuralVariantsLabel =
            count === 1 ? 'structural variant' : 'structural variants';

        const multipleStructuralVariantInfo =
            count > 0
                ? `: includes ${count} duplicate ${structuralVariantsLabel} in patients with multiple samples`
                : '';

        return `Structural Variants${multipleStructuralVariantInfo}`;
    }

    @computed
    get genePartnerChart(): JSX.Element {
        const partnerCounts = this.props.store.dataStore.genePartnerCounts;

        const partners = Object.keys(partnerCounts).sort(
            (a, b) => partnerCounts[b] - partnerCounts[a]
        );

        const maxCount = partners.reduce(
            (max, partner) => Math.max(max, partnerCounts[partner]),
            0
        );

        if (partners.length === 0) {
            return <div>No gene partners found.</div>;
        }

        return (
            <div className="borderedChart">
                <h4>
                    Gene partners for {this.props.store.gene.hugoGeneSymbol}
                </h4>

                {partners.map(partner => (
                    <button
                        key={partner}
                        type="button"
                        className={
                            this.selectedGenePartner === partner
                                ? 'btn btn-primary'
                                : 'btn btn-default'
                        }
                        onClick={() => this.selectGenePartner(partner)}
                        aria-pressed={this.selectedGenePartner === partner}
                        style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            marginBottom: '8px',
                            padding: '8px',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                            }}
                        >
                            <span>{partner}</span>
                            <strong>{partnerCounts[partner]}</strong>
                        </div>

                        <div
                            style={{
                                height: '8px',
                                backgroundColor: '#eeeeee',
                                marginTop: '5px',
                            }}
                        >
                            <div
                                style={{
                                    height: '8px',
                                    width: `${(partnerCounts[partner] /
                                        maxCount) *
                                        100}%`,
                                    backgroundColor: '#337ab7',
                                }}
                            />
                        </div>
                    </button>
                ))}

                {this.selectedGenePartner && (
                    <button
                        type="button"
                        className="btn btn-link"
                        onClick={this.clearGenePartnerFilter}
                    >
                        Clear partner filter
                    </button>
                )}
            </div>
        );
    }

    tableUI = MakeMobxView({
        await: () => [
            this.props.store.studyIdToStudy,
            this.props.store.molecularProfileIdToMolecularProfile,
        ],

        render: () => {
            return (
                <>
                    {this.genePartnerChart}

                    <ResultsViewStructuralVariantTable
                        dataStore={this.displayedDataStore}
                        itemsLabelPlural={this.itemsLabelPlural}
                        studyIdToStudy={this.props.store.studyIdToStudy.result}
                        molecularProfileIdToMolecularProfile={
                            this.props.store
                                .molecularProfileIdToMolecularProfile.result
                        }
                        transcriptToExons={this.props.store.transcriptToExons}
                        uniqueSampleKeyToTumorType={
                            this.props.store.uniqueSampleKeyToTumorType
                        }
                        structuralVariantOncoKbData={
                            this.props.store.structuralVariantOncoKbData
                        }
                        oncoKbCancerGenes={this.props.store.oncoKbCancerGenes}
                        usingPublicOncoKbInstance={
                            this.props.store.usingPublicOncoKbInstance
                        }
                        mergeOncoKbIcons={this.mergeFusionTableOncoKbIcons}
                        onOncoKbIconToggle={this.handleOncoKbIconToggle}
                    />
                </>
            );
        },

        renderPending: () => (
            <LoadingIndicator center={true} isLoading={true} size={'big'} />
        ),
        renderError: () => <ErrorMessage />,
    });

    public render() {
        return this.tableUI.component;
    }
}
