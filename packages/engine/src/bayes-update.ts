/**
 * 贝叶斯 CL 更新（正态-正态共轭，log 空间）。
 *
 * @param clPrior    先验 CL
 * @param cvPrior    先验 CV（对数域标准差）
 * @param concObs    实测浓度
 * @param concPred   预测浓度（基于先验 CL 的预测值）
 * @param cvLikelihood 似然 CV（测量误差，默认 0.10 = 10%）
 * @returns { CL_post, CL_post_CV }
 */
export function bayesUpdateCL(
  clPrior: number,
  cvPrior: number,
  concObs: number,
  concPred: number,
  cvLikelihood: number = 0.10
): { CL_post: number; CL_post_CV: number } {
  // 先验：log-normal
  const muPrior = Math.log(clPrior);
  const tauPrior = 1 / (cvPrior * cvPrior);

  // 似然：实测/预测比值反推 CL 调整
  const muLike = Math.log(clPrior * concPred / concObs);
  const tauLike = 1 / (cvLikelihood * cvLikelihood);

  // 后验
  const tauPost = tauPrior + tauLike;
  const muPost = (tauPrior * muPrior + tauLike * muLike) / tauPost;
  const sigmaPost = Math.sqrt(1 / tauPost);

  return {
    CL_post: Math.exp(muPost),
    CL_post_CV: sigmaPost,
  };
}
