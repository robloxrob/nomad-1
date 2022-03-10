import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import d3 from 'd3';
import { matchesState, useMachine } from 'ember-statecharts';
import { use } from 'ember-usable';
import evaluationsMachine from '../../machines/evaluations';

export default class EvaluationsController extends Controller {
  @service store;
  @service userSettings;

  @matchesState({ sidebar: 'open' })
  isSideBarOpen;

  @use statechart = useMachine(evaluationsMachine).withConfig({
    services: {
      loadEvaluation: this.loadEvaluation,
    },
    actions: {
      updateEvaluationQueryParameter: this.updateEvaluationQueryParameter,
      removeCurrentEvaluationQueryParameter:
        this.removeCurrentEvaluationQueryParameter,
    },
    guards: {
      sidebarIsOpen: this._sidebarIsOpen,
    },
  });

  queryParams = ['nextToken', 'currentEval', 'pageSize', 'status'];
  @tracked currentEval = null;

  @action
  _sidebarIsOpen() {
    return !!this.currentEval;
  }

  @action
  async loadEvaluation(context, { evaluation }) {
    let evaluationId;
    if (evaluation?.id) {
      evaluationId = evaluation.id;
    } else {
      evaluationId = this.currentEval;
    }
    return this.store.findRecord('evaluation', evaluationId, {
      reload: true,
    });
  }

  @action
  closeSidebar() {
    return this.statechart.send('MODAL_CLOSE');
  }

  @action
  async handleEvaluationClick(evaluation) {
    this.statechart.send('LOAD_EVALUATION', { evaluation });
  }

  @action
  updateEvaluationQueryParameter(context, { evaluation }) {
    this.currentEval = evaluation.id;
  }

  @action
  removeCurrentEvaluationQueryParameter() {
    this.currentEval = null;
  }

  get shouldDisableNext() {
    return !this.model.meta?.nextToken;
  }

  get shouldDisablePrev() {
    return !this.previousTokens.length;
  }

  get optionsEvaluationsStatus() {
    return [
      { key: null, label: 'All' },
      { key: 'blocked', label: 'Blocked' },
      { key: 'pending', label: 'Pending' },
      { key: 'complete', label: 'Complete' },
      { key: 'failed', label: 'Failed' },
      { key: 'canceled', label: 'Canceled' },
    ];
  }

  get currentEvalDetail() {
    return {
      ID: this.currentEval,
      Priority: 50,
      Type: 'service',
      TriggeredBy: 'job-register',
      JobID: 'example',
      JobModifyIndex: 52,
      NodeID: '',
      NodeModifyIndex: 0,
      Status: 'complete',
      StatusDescription: '',
      Wait: 0,
      NextEval: '',
      PreviousEval: '',
      BlockedEval: '',
      FailedTGAllocs: null,
      ClassEligibility: null,
      EscapedComputedClass: false,
      AnnotatePlan: false,
      SnapshotIndex: 53,
      QueuedAllocations: {
        cache: 0,
      },
      CreateIndex: 53,
      ModifyIndex: 55,
      RelatedEvals: [
        {
          'a9125398-1ef6-480a-80e5-ebfb4a74aeb8': {
            ID: 'a9125398-1ef6-480a-80e5-ebfb4a74aeb8',
            NextEval: '',
            PreviousEval: '04928ead-9b3d-40a7-b45d-d90d2afd2d8d',
            BlockedEval: '',
          },
        },
        {
          '04928ead-9b3d-40a7-b45d-d90d2afd2d8d': {
            ID: '04928ead-9b3d-40a7-b45d-d90d2afd2d8d',
            NextEval: '',
            PreviousEval: this.currentEval,
            BlockedEval: 'a9125398-1ef6-480a-80e5-ebfb4a74aeb8',
          },
        },
      ],
    };
  }

  get hierarchy() {
    const { RelatedEvals: data } = this.currentEvalDetail;

    return d3
      .stratify()
      .id((d) => d.id)
      .parentId((d) => d.PreviousEval)([...data, this.currentEvalDetail]);
  }

  get descendentsMap() {
    return this.hierarchy
      .descendants()
      .map((d) => d.children)
      .compact();
  }

  @tracked pageSize = this.userSettings.pageSize;
  @tracked nextToken = null;
  @tracked previousTokens = [];
  @tracked status = null;

  @action
  onChange(newPageSize) {
    this.pageSize = newPageSize;
  }

  @action
  onNext(nextToken) {
    this.previousTokens = [...this.previousTokens, this.nextToken];
    this.nextToken = nextToken;
  }

  @action
  onPrev() {
    const lastToken = this.previousTokens.pop();
    this.previousTokens = [...this.previousTokens];
    this.nextToken = lastToken;
  }

  @action
  refresh() {
    this._resetTokens();
    this.status = null;
    this.pageSize = this.userSettings.pageSize;
  }

  @action
  setStatus(selection) {
    this._resetTokens();
    this.status = selection;
  }

  _resetTokens() {
    this.nextToken = null;
    this.previousTokens = [];
  }
}
