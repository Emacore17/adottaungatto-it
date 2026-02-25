import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import type {
  AssignListingPromotionInput,
  ListingPromotionWithPlan,
  PlanRecord,
  PromotionEventRecord,
} from './models/promotion.model';
import { PromotionsRepository } from './promotions.repository';

const hourInMs = 60 * 60 * 1000;

type AssignListingPromotionResult = {
  promotion: ListingPromotionWithPlan;
  events: PromotionEventRecord[];
};

@Injectable()
export class PromotionsService {
  constructor(
    @Inject(PromotionsRepository)
    private readonly promotionsRepository: PromotionsRepository,
  ) {}

  async listPlans(onlyActive: boolean): Promise<PlanRecord[]> {
    return this.promotionsRepository.listPlans(onlyActive);
  }

  async listListingPromotions(listingId: string): Promise<ListingPromotionWithPlan[]> {
    const listing = await this.promotionsRepository.findListingForPromotion(listingId);
    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    return this.promotionsRepository.listPromotionsByListingId(listingId);
  }

  async assignListingPromotion(
    actor: RequestUser,
    input: AssignListingPromotionInput,
  ): Promise<AssignListingPromotionResult> {
    const listing = await this.promotionsRepository.findListingForPromotion(input.listingId);
    if (!listing) {
      throw new NotFoundException('Listing not found.');
    }

    if (listing.status === 'archived') {
      throw new BadRequestException('Cannot assign promotions to archived listings.');
    }

    const normalizedPlanCode = input.planCode.trim().toLowerCase();
    const plan = await this.promotionsRepository.findPlanByCode(normalizedPlanCode);
    if (!plan) {
      throw new NotFoundException(`Promotion plan "${normalizedPlanCode}" not found or inactive.`);
    }

    const startsAtDate = this.resolveStartDate(input.startsAt);
    const endsAtDate = new Date(startsAtDate.getTime() + plan.durationHours * hourInMs);
    const now = new Date();

    if (!Number.isFinite(endsAtDate.getTime()) || endsAtDate <= now) {
      throw new BadRequestException(
        'Invalid promotion window: computed end date must be in the future.',
      );
    }

    const status = startsAtDate <= now ? 'active' : 'scheduled';
    const actorUserId = await this.promotionsRepository.upsertActorUser(actor);
    const metadata = {
      ...(input.metadata ?? {}),
      planCode: plan.code,
      boostType: plan.boostType,
      durationHours: plan.durationHours,
      promotionWeight: plan.promotionWeight,
      assignedBy: {
        provider: actor.provider,
        subject: actor.providerSubject,
        roles: actor.roles,
      },
    };

    const created = await this.promotionsRepository.createListingPromotion({
      listingId: input.listingId,
      planId: plan.id,
      createdByUserId: actorUserId,
      status,
      startsAt: startsAtDate.toISOString(),
      endsAt: endsAtDate.toISOString(),
      metadata,
      activatedAt: status === 'active' ? startsAtDate.toISOString() : null,
    });

    return {
      promotion: {
        ...created.promotion,
        plan,
      },
      events: created.events,
    };
  }

  private resolveStartDate(rawStartsAt: string | undefined): Date {
    if (!rawStartsAt) {
      return new Date();
    }

    const parsed = new Date(rawStartsAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Field "startsAt" must be a valid ISO date string.');
    }

    return parsed;
  }
}
